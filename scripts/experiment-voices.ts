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

const VOICES = [
  { name: 'en-US-Studio-O',   label: 'Studio-O (current)' },
  { name: 'en-US-Studio-Q',   label: 'Studio-Q' },
  { name: 'en-US-Neural2-C',  label: 'Neural2-C' },
  { name: 'en-US-Neural2-F',  label: 'Neural2-F' },
  { name: 'en-US-Wavenet-F',  label: 'Wavenet-F' },
  { name: 'en-US-Wavenet-C',  label: 'Wavenet-C' },
  { name: 'en-US-News-K',     label: 'News-K' },
  { name: 'en-US-Casual-K',   label: 'Casual-K' },
  // Journey voices excluded — they don't support SSML phoneme tags,
  // which are critical for precise IPA pronunciation in speech therapy.
]

// ── Representative phonemes to test ────────────────────────────────────
// Covers the tricky ones (R, S, Z, TH, SH) plus a few easy ones for contrast.

const TEST_PHONEMES: { id: string; ssml: string; text: string }[] = [
  // Easy reference sounds
  { id: 'P',  ssml: '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="pʌ">puh</phoneme></prosody></speak>', text: 'puh' },
  { id: 'M',  ssml: '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="mːʌ">mmuh</phoneme></prosody></speak>', text: 'mmuh' },
  { id: 'L',  ssml: '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="lːʌ">lluh</phoneme></prosody></speak>', text: 'lluh' },

  // Tricky sounds — the ones that matter most
  { id: 'R',            ssml: '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="ɹɛ">reh</phoneme></prosody></speak>', text: 'reh' },
  { id: 'S',            ssml: '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="sə">suh</phoneme></prosody></speak>', text: 'suh' },
  { id: 'Z',            ssml: '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="zə">zuh</phoneme></prosody></speak>', text: 'zuh' },
  { id: 'SH',           ssml: '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="ʃːʌ">sshuh</phoneme></prosody></speak>', text: 'shuh' },
  { id: 'CH',           ssml: '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="tʃʌ">chuh</phoneme></prosody></speak>', text: 'chuh' },
  { id: 'TH_VOICELESS', ssml: '<speak><prosody rate="120%"><phoneme alphabet="ipa" ph="θə">thuh</phoneme></prosody></speak>', text: 'thuh' },
  { id: 'TH_VOICED',    ssml: '<speak><prosody rate="96%"><phoneme alphabet="ipa" ph="ðʌ">the</phoneme></prosody></speak>', text: 'the' },
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
  const needsSlowdown = syllables <= 2 && lastConsonant && FINAL_STOP_SOUNDS.has(lastConsonant)
  if (needsSlowdown) {
    return `<speak><prosody rate="92%"><phoneme alphabet="ipa" ph="${ipa}">${word}</phoneme></prosody><break time="150ms"/></speak>`
  }
  return `<speak><phoneme alphabet="ipa" ph="${ipa}">${word}</phoneme></speak>`
}

async function fileExists(path: string): Promise<boolean> {
  try { await stat(path); return true } catch { return false }
}

const AUDIO_CONFIG = { audioEncoding: 'MP3' as const }

async function synthesize(
  client: TextToSpeechClient,
  ssml: string,
  plainText: string,
  voiceName: string,
  outPath: string,
  label: string,
  force: boolean,
): Promise<void> {
  if (!force && await fileExists(outPath)) {
    console.log(`  SKIP ${label}`)
    return
  }

  // Try SSML first, fall back to plain text if voice doesn't support phoneme tags
  let response
  let usedFallback = false
  try {
    ;[response] = await client.synthesizeSpeech({
      input: { ssml },
      voice: { languageCode: 'en-US', name: voiceName },
      audioConfig: AUDIO_CONFIG,
    })
  } catch {
    try {
      ;[response] = await client.synthesizeSpeech({
        input: { text: plainText },
        voice: { languageCode: 'en-US', name: voiceName },
        audioConfig: AUDIO_CONFIG,
      })
      usedFallback = true
    } catch (e2: any) {
      console.error(`  FAIL ${label} — ${e2.message?.split('\n')[0] ?? 'unknown error'}`)
      return
    }
  }

  if (!response?.audioContent) {
    console.error(`  FAIL ${label} — no audio content`)
    return
  }

  const buffer = response.audioContent instanceof Uint8Array
    ? response.audioContent
    : Buffer.from(response.audioContent as string, 'base64')

  await writeFile(outPath, buffer)
  console.log(`  OK   ${label}${usedFallback ? ' (plain text)' : ''}`)
}

async function batch<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn))
  }
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

  // Filter to specific voice if requested
  const voiceFlag = args.indexOf('--voice')
  let voices = VOICES
  if (voiceFlag !== -1 && args[voiceFlag + 1]) {
    const requested = args[voiceFlag + 1]
    voices = VOICES.filter(v => v.name === requested)
    if (voices.length === 0) {
      console.error(`Unknown voice: ${requested}. Use --list to see available voices.`)
      process.exit(1)
    }
  }

  const client = new TextToSpeechClient()
  const baseDir = join(import.meta.dir, '..', 'public', 'audio', 'voice-experiments')

  for (const voice of voices) {
    const voiceDir = join(baseDir, voice.name)
    const phonemesDir = join(voiceDir, 'phonemes')
    const wordsDir = join(voiceDir, 'words')

    await mkdir(phonemesDir, { recursive: true })
    await mkdir(wordsDir, { recursive: true })

    console.log(`\n━━━ ${voice.label} (${voice.name}) ━━━`)

    // Phonemes
    console.log(`  Phonemes (${TEST_PHONEMES.length}):`)
    await batch(TEST_PHONEMES, 5, async (p) => {
      const outPath = join(phonemesDir, `${p.id}.mp3`)
      await synthesize(client, p.ssml, p.text, voice.name, outPath, `${p.id}`, force)
    })

    // Words
    console.log(`  Words (${TEST_WORDS.length}):`)
    await batch(TEST_WORDS, 5, async (w) => {
      const ssml = wordSsml(w.word, w.ipa, w.syllables, w.lastConsonant)
      const outPath = join(wordsDir, `${w.word}.mp3`)
      await synthesize(client, ssml, w.word, voice.name, outPath, `${w.word}`, force)
    })
  }

  console.log('\n✓ Done! Files in public/audio/voice-experiments/<voice-name>/')
  console.log('\nTo listen, open each folder and play the MP3s.')
  console.log('When you pick a winner, update VOICE in scripts/generate-audio.ts')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
