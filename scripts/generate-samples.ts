/**
 * Generate all 23 phoneme samples using Studio-O with syllable approach.
 * Uses consonant + vowel (ʌ) since TTS requires a vowel context.
 * Continuants use lengthened consonant (ː) to emphasize the sound.
 * Problem sounds (Z, TH, R) include variants for comparison.
 *
 * Run: bun run scripts/generate-samples.ts
 */

import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import { writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

const SAMPLES_DIR = join(import.meta.dir, '..', 'public', 'audio', 'samples')
const VOICE = { languageCode: 'en-US', name: 'en-US-Studio-O' } as const
const AUDIO_CONFIG = { audioEncoding: 'MP3' as const }

interface Sample {
  filename: string
  ssml: string
  label: string
}

const fast = (inner: string) => `<speak><prosody rate="120%">${inner}</prosody></speak>`
const slow = (inner: string) => `<speak><prosody rate="96%">${inner}</prosody></speak>`

const samples: Sample[] = [
  // === STOPS (6) — burst + schwa at 120% ===
  { filename: '01-stop-P.mp3',  ssml: fast(`<phoneme alphabet="ipa" ph="pʌ">puh</phoneme>`), label: 'P (pʌ)' },
  { filename: '02-stop-B.mp3',  ssml: fast(`<phoneme alphabet="ipa" ph="bʌ">buh</phoneme>`), label: 'B (bʌ)' },
  { filename: '03-stop-T.mp3',  ssml: fast(`<phoneme alphabet="ipa" ph="tʌ">tuh</phoneme>`), label: 'T (tʌ)' },
  { filename: '04-stop-D.mp3',  ssml: fast(`<phoneme alphabet="ipa" ph="dʌ">duh</phoneme>`), label: 'D (dʌ)' },
  { filename: '05-stop-K.mp3',  ssml: fast(`<phoneme alphabet="ipa" ph="kʌ">kuh</phoneme>`), label: 'K (kʌ)' },
  { filename: '06-stop-G.mp3',  ssml: fast(`<phoneme alphabet="ipa" ph="ɡʌ">guh</phoneme>`), label: 'G (ɡʌ)' },

  // === NASALS (3) ===
  { filename: '07-nasal-M.mp3',  ssml: fast(`<phoneme alphabet="ipa" ph="mːʌ">mmuh</phoneme>`), label: 'M (mːʌ)' },
  { filename: '08-nasal-N.mp3',  ssml: fast(`<phoneme alphabet="ipa" ph="nːʌ">nnuh</phoneme>`), label: 'N (nːʌ)' },
  // NG: winner was NG-b (ŋʌ at 96%)
  { filename: '09-nasal-NG.mp3', ssml: slow(`<phoneme alphabet="ipa" ph="ŋʌ">nguh</phoneme>`), label: 'NG (ŋʌ at 96%)' },

  // === FRICATIVES — settled sounds ===
  { filename: '10-fric-H.mp3',  ssml: fast(`<phoneme alphabet="ipa" ph="hʌ">huh</phoneme>`), label: 'H (hʌ)' },
  { filename: '11-fric-F.mp3',  ssml: fast(`<phoneme alphabet="ipa" ph="fːʌ">ffuh</phoneme>`), label: 'F (fːʌ)' },
  { filename: '12-fric-V.mp3',  ssml: fast(`<phoneme alphabet="ipa" ph="vːʌ">vvuh</phoneme>`), label: 'V (vːʌ)' },
  // S — variants to remove rhotic "sar" quality
  { filename: '13-fric-S-a.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="sːə">ssuh</phoneme>`),  label: 'S-a (sːə — schwa)' },
  { filename: '13-fric-S-b.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="sːæ">ssah</phoneme>`),  label: 'S-b (sːæ — short A)' },
  { filename: '13-fric-S-c.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="sːɑ">ssah</phoneme>`),  label: 'S-c (sːɑ — open ah)' },
  { filename: '13-fric-S-d.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="sə">suh</phoneme>`),    label: 'S-d (sə — short, no length)' },
  { filename: '13-fric-S-e.mp3', ssml: slow(`<phoneme alphabet="ipa" ph="sːə">ssuh</phoneme>`),  label: 'S-e (sːə at 96%)' },
  { filename: '15-fric-SH.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="ʃːʌ">sshuh</phoneme>`), label: 'SH (ʃːʌ)' },

  // === Z — variants (original best: zʌ but had subtle R) ===
  { filename: '14-fric-Z-a.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="zʌ">zuh</phoneme>`),  label: 'Z-a (zʌ — original best)' },
  { filename: '14-fric-Z-d.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="zæ">zah</phoneme>`),  label: 'Z-d (zæ — short A)' },
  { filename: '14-fric-Z-e.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="zɑ">zah</phoneme>`),  label: 'Z-e (zɑ — open ah)' },
  { filename: '14-fric-Z-f.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="zə">zuh</phoneme>`),  label: 'Z-f (zə — schwa)' },
  { filename: '14-fric-Z-g.mp3', ssml: slow(`<phoneme alphabet="ipa" ph="zʌ">zuh</phoneme>`),  label: 'Z-g (zʌ at 96%)' },

  // === TH voiceless — variants (original best: θʌ but had R) ===
  { filename: '16-fric-TH_VL-a.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="θʌ">thuh</phoneme>`),  label: 'TH_VL-a (θʌ — original best)' },
  { filename: '16-fric-TH_VL-d.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="θæ">thah</phoneme>`),  label: 'TH_VL-d (θæ — short A)' },
  { filename: '16-fric-TH_VL-e.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="θə">thuh</phoneme>`),  label: 'TH_VL-e (θə — schwa)' },
  { filename: '16-fric-TH_VL-f.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="θɑ">thah</phoneme>`),  label: 'TH_VL-f (θɑ — open ah)' },
  { filename: '16-fric-TH_VL-g.mp3', ssml: slow(`<phoneme alphabet="ipa" ph="θʌ">thuh</phoneme>`),  label: 'TH_VL-g (θʌ at 96%)' },

  // === TH voiced — variants (original best: ðʌ "the" but had subtle R) ===
  { filename: '17-fric-TH_V-a.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="ðʌ">thuh</phoneme>`),  label: 'TH_V-a (ðʌ)' },
  { filename: '17-fric-TH_V-c.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="ðʌ">the</phoneme>`),   label: 'TH_V-c (ðʌ text="the" — original best)' },
  { filename: '17-fric-TH_V-d.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="ðæ">thah</phoneme>`),  label: 'TH_V-d (ðæ — short A)' },
  { filename: '17-fric-TH_V-e.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="ðə">the</phoneme>`),   label: 'TH_V-e (ðə — schwa)' },
  { filename: '17-fric-TH_V-f.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="ðɑ">thah</phoneme>`),  label: 'TH_V-f (ðɑ — open ah)' },
  { filename: '17-fric-TH_V-g.mp3', ssml: slow(`<phoneme alphabet="ipa" ph="ðʌ">the</phoneme>`),   label: 'TH_V-g (ðʌ at 96%)' },

  // === GLIDES (2) ===
  { filename: '18-glide-W.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="wʌ">wuh</phoneme>`), label: 'W (wʌ)' },
  { filename: '19-glide-Y.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="jʌ">yuh</phoneme>`), label: 'Y (jʌ)' },

  // === LIQUIDS ===
  { filename: '20-liquid-L.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="lːʌ">lluh</phoneme>`), label: 'L (lːʌ)' },

  // R — ɹɑ at 96% was closest, want more "ruh" like start of "red"
  { filename: '21-liquid-R-g.mp3',  ssml: slow(`<phoneme alphabet="ipa" ph="ɹɑ">rah</phoneme>`),  label: 'R-g (ɹɑ at 96% — prev best)' },
  { filename: '21-liquid-R-i.mp3',  ssml: slow(`<phoneme alphabet="ipa" ph="ɹɛ">reh</phoneme>`),  label: 'R-i (ɹɛ at 96% — "red" vowel)' },
  { filename: '21-liquid-R-j.mp3',  ssml: fast(`<phoneme alphabet="ipa" ph="ɹɛ">reh</phoneme>`),  label: 'R-j (ɹɛ at 120%)' },
  { filename: '21-liquid-R-k.mp3',  ssml: slow(`<phoneme alphabet="ipa" ph="ɹʌ">ruh</phoneme>`),  label: 'R-k (ɹʌ at 96%)' },
  { filename: '21-liquid-R-l.mp3',  ssml: fast(`<phoneme alphabet="ipa" ph="ɹɛd">red</phoneme>`), label: 'R-l (ɹɛd "red" full word for ref)' },

  // === AFFRICATES (2) ===
  { filename: '22-affric-CH.mp3', ssml: fast(`<phoneme alphabet="ipa" ph="tʃʌ">chuh</phoneme>`), label: 'CH (tʃʌ)' },
  { filename: '23-affric-J.mp3',  ssml: fast(`<phoneme alphabet="ipa" ph="dʒʌ">juh</phoneme>`), label: 'J (dʒʌ)' },
]

async function main() {
  const client = new TextToSpeechClient()

  // Clean and recreate
  await rm(SAMPLES_DIR, { recursive: true, force: true })
  await mkdir(SAMPLES_DIR, { recursive: true })

  console.log(`Generating ${samples.length} phoneme samples...\n`)

  for (const s of samples) {
    try {
      const [response] = await client.synthesizeSpeech({
        input: { ssml: s.ssml },
        voice: VOICE,
        audioConfig: AUDIO_CONFIG,
      })

      if (!response.audioContent) {
        console.error(`  FAIL ${s.label}`)
        continue
      }

      const buffer = response.audioContent instanceof Uint8Array
        ? response.audioContent
        : Buffer.from(response.audioContent as string, 'base64')

      await writeFile(join(SAMPLES_DIR, s.filename), buffer)
      console.log(`  OK   ${s.filename}  →  ${s.label}`)
    } catch (err: any) {
      console.error(`  FAIL ${s.label} — ${err.message}`)
    }
  }

  console.log('\nDone!')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
