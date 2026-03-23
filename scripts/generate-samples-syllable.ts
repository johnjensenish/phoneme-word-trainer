/**
 * Test syllable-based phoneme synthesis approaches.
 * Since TTS can't produce isolated consonants, we use minimal syllables.
 */

import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import { writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const SAMPLES_DIR = join(import.meta.dir, '..', 'public', 'audio', 'samples')
const VOICE = { languageCode: 'en-US', name: 'en-US-Studio-O' } as const
const AUDIO_CONFIG = { audioEncoding: 'MP3' as const }

const tests = [
  // === FRICATIVE S ===
  // CV syllables with schwa
  { file: 'syl-S-1-suh.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="sʌ">suh</phoneme></speak>`, label: 'S: "sʌ" (suh)' },
  // CV with short a
  { file: 'syl-S-2-sah.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="sɑ">sah</phoneme></speak>`, label: 'S: "sɑ" (sah)' },
  // Longer onset, quick vowel
  { file: 'syl-S-3-ssuh.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="sːʌ">ssuh</phoneme></speak>`, label: 'S: "sːʌ" (ssuh)' },
  // Emphasis on the consonant with prosody
  { file: 'syl-S-4-slow-suh.mp3', ssml: `<speak><prosody rate="slow"><phoneme alphabet="ipa" ph="sʌ">suh</phoneme></prosody></speak>`, label: 'S: slow "sʌ"' },

  // === FRICATIVE F ===
  { file: 'syl-F-1-fuh.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="fʌ">fuh</phoneme></speak>`, label: 'F: "fʌ"' },
  { file: 'syl-F-2-ffuh.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="fːʌ">ffuh</phoneme></speak>`, label: 'F: "fːʌ"' },

  // === FRICATIVE SH ===
  { file: 'syl-SH-1-shuh.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="ʃʌ">shuh</phoneme></speak>`, label: 'SH: "ʃʌ"' },
  { file: 'syl-SH-2-sshuh.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="ʃːʌ">sshuh</phoneme></speak>`, label: 'SH: "ʃːʌ"' },

  // === NASAL M ===
  { file: 'syl-M-1-muh.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="mʌ">muh</phoneme></speak>`, label: 'M: "mʌ"' },
  { file: 'syl-M-2-mmuh.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="mːʌ">mmuh</phoneme></speak>`, label: 'M: "mːʌ"' },
  // Hum then release
  { file: 'syl-M-3-slow.mp3', ssml: `<speak><prosody rate="slow"><phoneme alphabet="ipa" ph="mʌ">muh</phoneme></prosody></speak>`, label: 'M: slow "mʌ"' },

  // === NASAL N ===
  { file: 'syl-N-1-nuh.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="nʌ">nuh</phoneme></speak>`, label: 'N: "nʌ"' },
  { file: 'syl-N-2-nnuh.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="nːʌ">nnuh</phoneme></speak>`, label: 'N: "nːʌ"' },

  // === LIQUID L ===
  { file: 'syl-L-1-luh.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="lʌ">luh</phoneme></speak>`, label: 'L: "lʌ"' },
  { file: 'syl-L-2-lluh.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="lːʌ">lluh</phoneme></speak>`, label: 'L: "lːʌ"' },

  // === LIQUID R ===
  { file: 'syl-R-1-ruh.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="ɹʌ">ruh</phoneme></speak>`, label: 'R: "ɹʌ"' },
  { file: 'syl-R-2-rruh.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="ɹːʌ">rruh</phoneme></speak>`, label: 'R: "ɹːʌ"' },

  // === STOP P (already uses schwa - compare with/without slow) ===
  { file: 'syl-P-1-puh.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="pʌ">puh</phoneme></speak>`, label: 'P: "pʌ"' },
  { file: 'syl-P-2-slow.mp3', ssml: `<speak><prosody rate="slow"><phoneme alphabet="ipa" ph="pʌ">puh</phoneme></prosody></speak>`, label: 'P: slow "pʌ"' },

  // === STOP K ===
  { file: 'syl-K-1-kuh.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="kʌ">kuh</phoneme></speak>`, label: 'K: "kʌ"' },

  // === AFFRICATE CH ===
  { file: 'syl-CH-1-chuh.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="tʃʌ">chuh</phoneme></speak>`, label: 'CH: "tʃʌ"' },

  // === GLIDE W ===
  { file: 'syl-W-1-wuh.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="wʌ">wuh</phoneme></speak>`, label: 'W: "wʌ"' },

  // === H (special - already breathy) ===
  { file: 'syl-H-1-huh.mp3', ssml: `<speak><phoneme alphabet="ipa" ph="hʌ">huh</phoneme></speak>`, label: 'H: "hʌ"' },
]

async function main() {
  const client = new TextToSpeechClient()
  await mkdir(SAMPLES_DIR, { recursive: true })

  console.log(`Generating ${tests.length} syllable samples...\n`)

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
