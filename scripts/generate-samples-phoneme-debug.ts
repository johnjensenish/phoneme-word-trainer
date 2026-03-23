/**
 * Debug: test different SSML approaches for fricative "S" phoneme.
 */

import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const SAMPLES_DIR = join(import.meta.dir, '..', 'public', 'audio', 'samples')
const VOICE = { languageCode: 'en-US', name: 'en-US-Studio-O' } as const
const AUDIO_CONFIG = { audioEncoding: 'MP3' as const }

const tests = [
  // Current approach
  { file: 'debug-S-1-current.mp3', ssml: `<speak><prosody duration="800ms"><phoneme alphabet="ipa" ph="sːː">Sss</phoneme></prosody></speak>`, label: 'current: duration + phoneme + "Sss"' },

  // Phoneme tag only, no prosody
  { file: 'debug-S-2-phoneme-only.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="sːː">S</phoneme></speak>`, label: 'phoneme only: ph="sːː" text="S"' },

  // Phoneme without length marks
  { file: 'debug-S-3-short-ipa.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="s">S</phoneme></speak>`, label: 'short IPA: ph="s"' },

  // Just the IPA sustained, neutral inner text
  { file: 'debug-S-4-sustained-dot.mp3', ssml: `<speak><prosody duration="600ms"><phoneme alphabet="ipa" ph="s">..</phoneme></prosody></speak>`, label: 'duration 600ms + ph="s" text=".."' },

  // Plain text approach - just say the letter
  { file: 'debug-S-5-plain.mp3', ssml: `<speak><say-as interpret-as="verbatim">s</say-as></speak>`, label: 'say-as verbatim "s"' },

  // Try with break and simple phoneme
  { file: 'debug-S-6-repeated.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="s">s</phoneme><break time="50ms"/><phoneme alphabet="ipa" ph="s">s</phoneme><break time="50ms"/><phoneme alphabet="ipa" ph="s">s</phoneme></speak>`, label: 'repeated phoneme with breaks' },

  // Also test a stop (P) to compare
  { file: 'debug-P-1-current.mp3', ssml: `<speak><prosody rate="slow"><phoneme alphabet="ipa" ph="pʌ">Puh</phoneme></prosody></speak>`, label: 'P current approach' },
  { file: 'debug-P-2-no-prosody.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="pʌ">P</phoneme></speak>`, label: 'P phoneme only' },

  // M nasal test
  { file: 'debug-M-1-current.mp3', ssml: `<speak><prosody duration="700ms"><phoneme alphabet="ipa" ph="mːː">Mmm</phoneme></prosody></speak>`, label: 'M current' },
  { file: 'debug-M-2-phoneme-only.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="mːː">M</phoneme></speak>`, label: 'M phoneme only' },
]

async function main() {
  const client = new TextToSpeechClient()
  await mkdir(SAMPLES_DIR, { recursive: true })

  console.log(`Generating ${tests.length} debug samples...\n`)

  for (const t of tests) {
    try {
      const [response] = await client.synthesizeSpeech({
        input: { ssml: t.ssml },
        voice: VOICE,
        audioConfig: AUDIO_CONFIG,
      })

      if (!response.audioContent) {
        console.error(`  FAIL ${t.label}`)
        continue
      }

      const buffer = response.audioContent instanceof Uint8Array
        ? response.audioContent
        : Buffer.from(response.audioContent as string, 'base64')

      await writeFile(join(SAMPLES_DIR, t.file), buffer)
      console.log(`  OK   ${t.file}  →  ${t.label}`)
    } catch (err: any) {
      console.error(`  FAIL ${t.label} — ${err.message}`)
    }
  }

  console.log('\nDone!')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
