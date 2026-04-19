/**
 * Download Wikimedia Commons IPA phoneme audio (real human voices) for
 * comparison against our generated TTS audio.
 *
 * Saves transcoded MP3s to public/audio/voice-samples/wikimedia/<ID>.mp3
 */

import { writeFile, mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const OUT_DIR = join(process.cwd(), 'public/audio/voice-samples/wikimedia')

// path = <hash1>/<hash2>/<Name>.ogg
const PHONEMES: { id: string; path: string; speaker?: string }[] = [
  { id: 'P',            path: '5/51/Voiceless_bilabial_plosive.ogg' },
  { id: 'B',            path: '2/2c/Voiced_bilabial_plosive.ogg' },
  { id: 'T',            path: '0/02/Voiceless_alveolar_plosive.ogg' },
  { id: 'D',            path: '0/01/Voiced_alveolar_plosive.ogg' },
  { id: 'K',            path: 'e/e3/Voiceless_velar_plosive.ogg' },
  { id: 'G',            path: '1/12/Voiced_velar_plosive_02.ogg' },
  { id: 'M',            path: 'a/a9/Bilabial_nasal.ogg' },
  { id: 'N',            path: '2/29/Alveolar_nasal.ogg' },
  { id: 'NG',           path: '3/39/Velar_nasal.ogg' },
  { id: 'H',            path: 'd/da/Voiceless_glottal_fricative.ogg' },
  { id: 'F',            path: 'c/c7/Voiceless_labio-dental_fricative.ogg' },
  { id: 'V',            path: '4/42/Voiced_labio-dental_fricative.ogg' },
  { id: 'S',            path: 'a/ac/Voiceless_alveolar_sibilant.ogg' },
  { id: 'Z',            path: 'c/c0/Voiced_alveolar_sibilant.ogg' },
  { id: 'SH',           path: 'c/cc/Voiceless_palato-alveolar_sibilant.ogg' },
  { id: 'TH_VOICELESS', path: '8/80/Voiceless_dental_fricative.ogg' },
  { id: 'TH_VOICED',    path: '6/6a/Voiced_dental_fricative.ogg' },
  { id: 'W',            path: 'f/f2/Voiced_labio-velar_approximant.ogg' },
  { id: 'Y',            path: 'e/e8/Palatal_approximant.ogg' },
  { id: 'L',            path: 'b/bc/Alveolar_lateral_approximant.ogg' },
  { id: 'R',            path: '3/33/Postalveolar_approximant.ogg' },
  { id: 'CH',           path: '9/97/Voiceless_palato-alveolar_affricate.ogg' },
  { id: 'J',            path: 'e/e6/Voiced_palato-alveolar_affricate.ogg' },
]

await mkdir(OUT_DIR, { recursive: true })

async function fetchWithRetry(url: string, attempt = 1): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'PhonemeWordTrainer/1.0 (https://github.com/johnjensenish/phoneme-word-trainer; john.jensen@substantial.com) voice experiment',
    },
  })
  if (res.status === 429 && attempt <= 5) {
    const wait = 2000 * attempt
    console.log(`  429, retry in ${wait}ms (attempt ${attempt})`)
    await sleep(wait)
    return fetchWithRetry(url, attempt + 1)
  }
  return res
}

for (const { id, path } of PHONEMES) {
  const filename = path.split('/').pop()!
  const url = `https://upload.wikimedia.org/wikipedia/commons/transcoded/${path}/${filename}.mp3`
  const outPath = join(OUT_DIR, `${id}.mp3`)

  // Skip if already downloaded and non-empty
  try {
    const s = await stat(outPath)
    if (s.size > 1000) {
      console.log(`${id.padEnd(14)} already present (${(s.size / 1024).toFixed(1)} KB) — skip`)
      continue
    }
  } catch {}

  process.stdout.write(`${id.padEnd(14)} ${url} ... `)
  const res = await fetchWithRetry(url)
  if (!res.ok) {
    console.log(`FAILED ${res.status}`)
    await sleep(1500)
    continue
  }
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(outPath, buf)
  console.log(`${(buf.length / 1024).toFixed(1)} KB`)
  await sleep(750)
}

console.log('\nDone.')
