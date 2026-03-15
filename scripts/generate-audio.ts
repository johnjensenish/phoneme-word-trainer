/**
 * Generate MP3 audio files for all phonemes and words using Google Cloud TTS.
 *
 * Prerequisites:
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

import { sounds } from '../src/data/sounds'
import { words } from '../src/data/words'
import { PHONEME_LABELS } from '../src/engine/drillMode'
import type { Sound } from '../src/data/types'

const VOICE = { languageCode: 'en-US', name: 'en-US-Neural2-C' } as const
const AUDIO_CONFIG = { audioEncoding: 'MP3' as const }

const PHONEMES_DIR = join(import.meta.dir, '..', 'public', 'audio', 'phonemes')
const WORDS_DIR = join(import.meta.dir, '..', 'public', 'audio', 'words')

const force = process.argv.includes('--force')

// --- SSML generation ---

/** Strip "/.../" wrapper from IPA values in sounds.ts */
function bareIpa(ipa: string): string {
  return ipa.replace(/^\//, '').replace(/\/$/, '')
}

/** Burst + schwa release for sounds that can't be sustained */
function burstSsml(bare: string, label: string): string {
  return `<speak><prosody rate="slow"><phoneme alphabet="ipa" ph="${bare}ʌ">${label}</phoneme></prosody></speak>`
}

/** Sustained sound with configurable duration */
function sustainedSsml(bare: string, label: string, durationMs: number): string {
  return `<speak><prosody duration="${durationMs}ms"><phoneme alphabet="ipa" ph="${bare}ːː">${label}</phoneme></prosody></speak>`
}

/** Build SSML for an isolated phoneme sound, using the sound's type from sounds.ts */
function phonemeSsml(sound: Sound, label: string): string {
  const bare = bareIpa(sound.ipa)

  switch (sound.type) {
    case 'stop_voiceless':
    case 'stop_voiced':
    case 'affricate':
    case 'glide':
      return burstSsml(bare, label)
    case 'fricative':
      return sustainedSsml(bare, label, 800)
    case 'nasal':
    case 'liquid':
      return sustainedSsml(bare, label, 700)
    default:
      return `<speak><prosody rate="slow">${label}</prosody></speak>`
  }
}

/** Build SSML for a word */
function wordSsml(word: string, ipa: string): string {
  return `<speak><prosody rate="85%"><phoneme alphabet="ipa" ph="${ipa}">${word}</phoneme></prosody></speak>`
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

// --- Main ---

async function main() {
  const client = new TextToSpeechClient()

  await mkdir(PHONEMES_DIR, { recursive: true })
  await mkdir(WORDS_DIR, { recursive: true })

  // Build a lookup: sound_id -> Sound
  const soundMap = new Map(sounds.map(s => [s.sound_id, s]))

  // --- Phonemes ---
  const phonemeIds = Object.keys(PHONEME_LABELS)
  console.log(`\nGenerating ${phonemeIds.length} phoneme files...`)

  for (const soundId of phonemeIds) {
    const sound = soundMap.get(soundId)
    if (!sound) {
      console.warn(`  WARN No sound data for ${soundId}, skipping`)
      continue
    }

    const label = PHONEME_LABELS[soundId]!
    const ssml = phonemeSsml(sound, label)
    const outPath = join(PHONEMES_DIR, `${soundId}.mp3`)
    await synthesize(client, ssml, outPath, `phoneme/${soundId}`)
  }

  // --- Words ---
  console.log(`\nGenerating ${words.length} word files...`)

  for (const word of words) {
    const ssml = wordSsml(word.word, word.ipa)
    const outPath = join(WORDS_DIR, `${word.word_id}.mp3`)
    await synthesize(client, ssml, outPath, `word/${word.word_id} (${word.word})`)
  }

  console.log('\nDone!')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
