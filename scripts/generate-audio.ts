/**
 * Generate MP3 audio files for all phonemes and words using Google Cloud TTS.
 *
 * Runs automatically in CI via .github/workflows/generate-audio.yml when
 * src/data/words.ts, this script, or public/audio/** changes in a PR.
 *
 * Prerequisites (local runs only):
 *   1. Enable Cloud Text-to-Speech API in your GCP project
 *   2. Run: gcloud auth application-default login
 *   3. Run: bun run generate-audio
 *
 * Flags:
 *   --force   Regenerate files that already exist
 */

import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import { writeFile, mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

import { words } from '../src/data/words'
import { PHONEME_LABELS } from '../src/engine/drillMode'

const VOICE = { languageCode: 'en-US', name: 'en-US-Studio-O' } as const
const AUDIO_CONFIG = { audioEncoding: 'MP3' as const }

const PHONEMES_DIR = join(import.meta.dir, '..', 'public', 'audio', 'phonemes')
const WORDS_DIR = join(import.meta.dir, '..', 'public', 'audio', 'words')

const force = process.argv.includes('--force')

// --- Finalized phoneme SSML (hand-tuned via generate-samples.ts) ---
//
// Most use consonant+vowel at 120% rate. Exceptions:
//   NG → ŋʌ at 96% (needs slower pace for velar nasal)
//   Z  → zə at 120% (schwa avoids rhotic artifact from ʌ)
//   TH_VOICELESS → θə at 120% (schwa avoids rhotic artifact)
//   TH_VOICED → ðʌ at 96% (slower pace, text="the")
//   R  → ɹɛ at 120% ("red" vowel gives clean "ruh")

const PHONEME_SSML: Record<string, string> = {
  // Stops — burst + schwa
  P:  '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="pʌ">puh</phoneme></prosody></speak>',
  B:  '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="bʌ">buh</phoneme></prosody></speak>',
  T:  '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="tʌ">tuh</phoneme></prosody></speak>',
  D:  '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="dʌ">duh</phoneme></prosody></speak>',
  K:  '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="kʌ">kuh</phoneme></prosody></speak>',
  G:  '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="ɡʌ">guh</phoneme></prosody></speak>',

  // Nasals
  M:  '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="mːʌ">mmuh</phoneme></prosody></speak>',
  N:  '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="nːʌ">nnuh</phoneme></prosody></speak>',
  NG: '<speak><prosody rate="96%"><phoneme alphabet="ipa" ph="ŋʌ">nguh</phoneme></prosody></speak>',

  // Fricatives
  H:            '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="hʌ">huh</phoneme></prosody></speak>',
  F:            '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="fːʌ">ffuh</phoneme></prosody></speak>',
  V:            '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="vːʌ">vvuh</phoneme></prosody></speak>',
  S:            '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="sə">suh</phoneme></prosody></speak>',
  Z:            '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="zə">zuh</phoneme></prosody></speak>',
  SH:           '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="ʃːʌ">sshuh</phoneme></prosody></speak>',
  TH_VOICELESS: '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="θə">thuh</phoneme></prosody></speak>',
  TH_VOICED:    '<speak><prosody rate="96%"><phoneme alphabet="ipa" ph="ðʌ">the</phoneme></prosody></speak>',

  // Glides
  W: '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="wʌ">wuh</phoneme></prosody></speak>',
  Y: '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="jʌ">yuh</phoneme></prosody></speak>',

  // Liquids
  L: '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="lːʌ">lluh</phoneme></prosody></speak>',
  R: '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="ɹɛ">reh</phoneme></prosody></speak>',

  // Affricates
  CH: '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="tʃʌ">chuh</phoneme></prosody></speak>',
  J:  '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="dʒʌ">juh</phoneme></prosody></speak>',
}

/**
 * Final stops and affricates — these get clipped on short words
 * because the burst has no trailing vowel to sustain.
 */
const FINAL_STOP_SOUNDS = new Set(['P', 'B', 'T', 'D', 'K', 'G', 'CH', 'J'])

/** Build SSML for a word, slowing short words with final stops to avoid clipping */
function wordSsml(word: string, ipa: string, syllables: number, lastConsonant: string | null): string {
  // Short words ending in stops clip easily — slow them down and add a breath pause
  const needsSlowdown = syllables <= 2 && lastConsonant && FINAL_STOP_SOUNDS.has(lastConsonant)
  if (needsSlowdown) {
    return `<speak><prosody rate="92%"><phoneme alphabet="ipa" ph="${ipa}">${word}</phoneme></prosody><break time="150ms"/></speak>`
  }
  return `<speak><phoneme alphabet="ipa" ph="${ipa}">${word}</phoneme></speak>`
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function synthesize(
  client: TextToSpeechClient,
  ssml: string,
  outPath: string,
  label: string,
): Promise<void> {
  if (!force && await fileExists(outPath)) {
    console.log(`  SKIP ${label} (exists)`)
    return
  }

  const [response] = await client.synthesizeSpeech({
    input: { ssml },
    voice: VOICE,
    audioConfig: AUDIO_CONFIG,
  })

  if (!response.audioContent) {
    console.error(`  FAIL ${label} — no audio content returned`)
    return
  }

  const buffer = response.audioContent instanceof Uint8Array
    ? response.audioContent
    : Buffer.from(response.audioContent as string, 'base64')

  await writeFile(outPath, buffer)
  console.log(`  OK   ${label}`)
}

/** Process items in batches of `size`, running each batch concurrently */
async function batch<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn))
  }
}

// --- Main ---

async function main() {
  const client = new TextToSpeechClient()

  await mkdir(PHONEMES_DIR, { recursive: true })
  await mkdir(WORDS_DIR, { recursive: true })

  // --- Phonemes ---
  const phonemeIds = Object.keys(PHONEME_LABELS)
  console.log(`\nGenerating ${phonemeIds.length} phoneme files...`)

  await batch(phonemeIds, 5, async (soundId) => {
    const ssml = PHONEME_SSML[soundId]
    if (!ssml) {
      console.warn(`  WARN No SSML for ${soundId}, skipping`)
      return
    }
    const outPath = join(PHONEMES_DIR, `${soundId}.mp3`)
    await synthesize(client, ssml, outPath, `phoneme/${soundId}`)
  })

  // --- Words ---
  console.log(`\nGenerating ${words.length} word files...`)

  await batch(words, 5, async (word) => {
    const lastConsonant = word.consonant_ids.length > 0
      ? word.consonant_ids[word.consonant_ids.length - 1]
      : null
    const ssml = wordSsml(word.word, word.ipa, word.syllable_count, lastConsonant)
    const outPath = join(WORDS_DIR, `${word.word}.mp3`)
    await synthesize(client, ssml, outPath, `word/${word.word}`)
  })

  console.log('\nDone!')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
