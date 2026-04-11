/**
 * Experiment with different Google Cloud TTS voices.
 *
 * Generates a representative subset of phonemes and words for each voice,
 * organized into per-voice folders under public/audio/voice-experiments/.
 *
 * Usage:
 *   bun run scripts/experiment-voices.ts                  # all voices
 *   bun run scripts/experiment-voices.ts --voice en-US-Journey-F  # one voice
 *   bun run scripts/experiment-voices.ts --force           # regenerate existing
 *   bun run scripts/experiment-voices.ts --list            # list available voices
 *
 * Prerequisites:
 *   gcloud auth application-default login
 */

import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import { writeFile, mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

// ── Voices to experiment with ──────────────────────────────────────────
// Add or remove voices here. Each entry is { name, label }.
// Current production voice is en-US-Studio-O.
//
// Variants that share a ttsName (e.g. Casual-K-slow → en-US-Casual-K) are
// generated with interleaved API calls to avoid Google TTS server-side caching,
// which ignores audioConfig.speakingRate when the same SSML is sent twice quickly.

type Voice = {
  name: string          // directory name under voice-experiments/
  ttsName?: string      // actual Google TTS voice name (defaults to name)
  label: string
  speakingRate?: number  // audioConfig.speakingRate override (default 1.0)
}

const VOICES: Voice[] = [
  { name: 'en-US-Studio-O',   label: 'Studio-O (current)' },
  { name: 'en-US-Studio-Q',   label: 'Studio-Q' },
  { name: 'en-US-Neural2-C',  label: 'Neural2-C' },
  { name: 'en-US-Neural2-F',  label: 'Neural2-F' },
  { name: 'en-US-Wavenet-F',  label: 'Wavenet-F' },
  { name: 'en-US-Wavenet-C',  label: 'Wavenet-C' },
  { name: 'en-US-News-K',     label: 'News-K' },
  { name: 'en-US-Casual-K',   label: 'Casual-K', speakingRate: 0.85 },
  // Journey voices excluded — they don't support SSML phoneme tags,
  // which are critical for precise IPA pronunciation in speech therapy.
]

// ── All phonemes ───────────────────────────────────────────────────────
// Matches the production SSML from generate-audio.ts

const TEST_PHONEMES: { id: string; ssml: string; text: string }[] = [
  // Stops
  { id: 'P',  ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="pʌ">puh</phoneme></prosody><break time="150ms"/></speak>', text: 'puh' },
  { id: 'B',  ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="bʌ">buh</phoneme></prosody><break time="150ms"/></speak>', text: 'buh' },
  { id: 'T',  ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="tʌ">tuh</phoneme></prosody><break time="150ms"/></speak>', text: 'tuh' },
  { id: 'D',  ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="dʌ">duh</phoneme></prosody><break time="150ms"/></speak>', text: 'duh' },
  { id: 'K',  ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="kʌ">kuh</phoneme></prosody><break time="150ms"/></speak>', text: 'kuh' },
  { id: 'G',  ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="ɡʌ">guh</phoneme></prosody><break time="150ms"/></speak>', text: 'guh' },

  // Nasals
  { id: 'M',  ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="mːʌ">mmuh</phoneme></prosody><break time="150ms"/></speak>', text: 'mmuh' },
  { id: 'N',  ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="nːʌ">nnuh</phoneme></prosody><break time="150ms"/></speak>', text: 'nnuh' },
  { id: 'NG', ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="ŋʌ">nguh</phoneme></prosody><break time="150ms"/></speak>', text: 'nguh' },

  // Fricatives
  { id: 'H',            ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="hʌ">huh</phoneme></prosody><break time="150ms"/></speak>', text: 'huh' },
  { id: 'F',            ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="fːʌ">ffuh</phoneme></prosody><break time="150ms"/></speak>', text: 'ffuh' },
  { id: 'V',            ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="vːʌ">vvuh</phoneme></prosody><break time="150ms"/></speak>', text: 'vvuh' },
  { id: 'S',            ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="sə">suh</phoneme></prosody><break time="150ms"/></speak>', text: 'suh' },
  { id: 'Z',            ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="zə">zuh</phoneme></prosody><break time="150ms"/></speak>', text: 'zuh' },
  { id: 'SH',           ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="ʃːʌ">sshuh</phoneme></prosody><break time="150ms"/></speak>', text: 'shuh' },
  { id: 'TH_VOICELESS', ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="θə">thuh</phoneme></prosody><break time="150ms"/></speak>', text: 'thuh' },
  { id: 'TH_VOICED',    ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="ðʌ">the</phoneme></prosody><break time="150ms"/></speak>', text: 'the' },

  // Glides
  { id: 'W',  ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="wʌ">wuh</phoneme></prosody><break time="150ms"/></speak>', text: 'wuh' },
  { id: 'Y',  ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="jʌ">yuh</phoneme></prosody><break time="150ms"/></speak>', text: 'yuh' },

  // Liquids
  { id: 'L',  ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="lːʌ">lluh</phoneme></prosody><break time="150ms"/></speak>', text: 'lluh' },
  { id: 'R',  ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="ɹɛ">reh</phoneme></prosody><break time="150ms"/></speak>', text: 'reh' },

  // Affricates
  { id: 'CH', ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="tʃʌ">chuh</phoneme></prosody><break time="150ms"/></speak>', text: 'chuh' },
  { id: 'J',  ssml: '<speak><prosody rate="80%"><phoneme alphabet="ipa" ph="dʒʌ">juh</phoneme></prosody><break time="150ms"/></speak>', text: 'juh' },
]

// ── Representative words to test ───────────────────────────────────────
// Mix of short/long, easy/hard sounds, stop-final clipping risk.

const TEST_WORDS: { word: string; ipa: string; syllables: number; lastConsonant: string | null }[] = [
  { word: 'up',         ipa: 'ʌp',          syllables: 1, lastConsonant: 'P' },
  { word: 'ball',       ipa: 'bɔːl',        syllables: 1, lastConsonant: 'L' },
  { word: 'cat',        ipa: 'kæt',         syllables: 1, lastConsonant: 'T' },
  { word: 'fish',       ipa: 'fɪʃ',         syllables: 1, lastConsonant: 'SH' },
  { word: 'red',        ipa: 'ɹɛd',         syllables: 1, lastConsonant: 'D' },
  { word: 'three',      ipa: 'θɹiː',        syllables: 1, lastConsonant: null },
  { word: 'that',       ipa: 'ðæt',          syllables: 1, lastConsonant: 'T' },
  { word: 'rabbit',     ipa: 'ɹæbɪt',       syllables: 2, lastConsonant: 'T' },
  { word: 'strawberry', ipa: 'stɹɔːbɛɹi',   syllables: 3, lastConsonant: null },
  { word: 'sandwich',   ipa: 'sænwɪtʃ',     syllables: 2, lastConsonant: 'CH' },
]

// ── Helpers ─────────────────────────────────────────────────────────────

const FINAL_STOP_SOUNDS = new Set(['P', 'B', 'T', 'D', 'K', 'G', 'CH', 'J'])

function wordSsml(word: string, ipa: string, syllables: number, lastConsonant: string | null): string {
  const isStopFinal = syllables <= 2 && lastConsonant && FINAL_STOP_SOUNDS.has(lastConsonant)
  if (isStopFinal) {
    return `<speak><prosody rate="92%"><phoneme alphabet="ipa" ph="${ipa}">${word}</phoneme></prosody><break time="300ms"/></speak>`
  }
  return `<speak><phoneme alphabet="ipa" ph="${ipa}">${word}</phoneme><break time="150ms"/></speak>`
}

async function fileExists(path: string): Promise<boolean> {
  try { await stat(path); return true } catch { return false }
}

/** Synthesize one audio file. Returns true if the file was generated. */
async function synthesize(
  client: TextToSpeechClient,
  ssml: string,
  plainText: string,
  voiceName: string,
  outPath: string,
  label: string,
  force: boolean,
  speakingRate?: number,
): Promise<boolean> {
  if (!force && await fileExists(outPath)) {
    console.log(`  SKIP ${label}`)
    return false
  }

  const audioConfig = {
    audioEncoding: 'MP3' as const,
    ...(speakingRate != null && { speakingRate }),
  }

  // Try SSML first, fall back to plain text if voice doesn't support phoneme tags
  let response
  let usedFallback = false
  try {
    ;[response] = await client.synthesizeSpeech({
      input: { ssml },
      voice: { languageCode: 'en-US', name: voiceName },
      audioConfig,
    })
  } catch {
    try {
      ;[response] = await client.synthesizeSpeech({
        input: { text: plainText },
        voice: { languageCode: 'en-US', name: voiceName },
        audioConfig,
      })
      usedFallback = true
    } catch (e2: any) {
      console.error(`  FAIL ${label} — ${e2.message?.split('\n')[0] ?? 'unknown error'}`)
      return false
    }
  }

  if (!response?.audioContent) {
    console.error(`  FAIL ${label} — no audio content`)
    return false
  }

  const buffer = response.audioContent instanceof Uint8Array
    ? response.audioContent
    : Buffer.from(response.audioContent as string, 'base64')

  await writeFile(outPath, buffer)
  console.log(`  OK   ${label}${usedFallback ? ' (plain text)' : ''}`)
  return true
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--list')) {
    console.log('\nAvailable voices:')
    for (const v of VOICES) {
      console.log(`  ${v.name.padEnd(24)} ${v.label}`)
    }
    console.log(`\nTotal: ${VOICES.length} voices × ${TEST_PHONEMES.length} phonemes + ${TEST_WORDS.length} words = ${VOICES.length * (TEST_PHONEMES.length + TEST_WORDS.length)} files`)
    return
  }

  const force = args.includes('--force')

  // Filter to specific voice if requested (also includes variants sharing the same TTS voice)
  const voiceFlag = args.indexOf('--voice')
  let voices = VOICES
  if (voiceFlag !== -1 && args[voiceFlag + 1]) {
    const requested = args[voiceFlag + 1]
    const exact = VOICES.filter(v => v.name === requested)
    if (exact.length === 0) {
      console.error(`Unknown voice: ${requested}. Use --list to see available voices.`)
      process.exit(1)
    }
    // Include variants that share the same underlying TTS voice
    const ttsName = exact[0].ttsName ?? exact[0].name
    voices = VOICES.filter(v => v.name === requested || v.ttsName === requested || (v.ttsName ?? v.name) === ttsName)
  }

  const client = new TextToSpeechClient()
  const baseDir = join(import.meta.dir, '..', 'public', 'audio', 'voice-experiments')

  // Group voices by TTS voice name so variants sharing the same underlying voice
  // can be generated with interleaved API calls (avoids Google TTS server-side
  // caching that ignores audioConfig differences for identical SSML).
  const groups = new Map<string, Voice[]>()
  for (const voice of voices) {
    const key = voice.ttsName ?? voice.name
    const group = groups.get(key) ?? []
    group.push(voice)
    groups.set(key, group)
  }

  for (const [ttsVoice, group] of groups) {
    // Prepare output directories
    const dirs = await Promise.all(group.map(async (voice) => {
      const voiceDir = join(baseDir, voice.name)
      const phonemesDir = join(voiceDir, 'phonemes')
      const wordsDir = join(voiceDir, 'words')
      await mkdir(phonemesDir, { recursive: true })
      await mkdir(wordsDir, { recursive: true })
      return { voice, phonemesDir, wordsDir }
    }))

    const labels = group.map(v => v.label).join(', ')
    console.log(`\n━━━ ${labels} (${ttsVoice}) ━━━`)

    // Phonemes — interleave variants per phoneme
    console.log(`  Phonemes (${TEST_PHONEMES.length}):`)
    for (const p of TEST_PHONEMES) {
      for (const { voice, phonemesDir } of dirs) {
        const outPath = join(phonemesDir, `${p.id}.mp3`)
        await synthesize(client, p.ssml, p.text, ttsVoice, outPath, `${voice.label} ${p.id}`, force, voice.speakingRate)
      }
    }

    // Words — interleave variants per word
    console.log(`  Words (${TEST_WORDS.length}):`)
    for (const w of TEST_WORDS) {
      const ssml = wordSsml(w.word, w.ipa, w.syllables, w.lastConsonant)
      for (const { voice, wordsDir } of dirs) {
        const outPath = join(wordsDir, `${w.word}.mp3`)
        await synthesize(client, ssml, w.word, ttsVoice, outPath, `${w.word} (${voice.label})`, force, voice.speakingRate)
      }
    }
  }

  console.log('\n✓ Done! Files in public/audio/voice-experiments/<voice-name>/')
  console.log('\nTo listen, open each folder and play the MP3s.')
  console.log('When you pick a winner, update VOICE in scripts/generate-audio.ts')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
