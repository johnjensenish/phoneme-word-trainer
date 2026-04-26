/**
 * Download Google Dictionary US-English word pronunciations for each phoneme.
 *
 * Each phoneme is represented by one short, common English word whose
 * onset (or coda, for NG) is the target sound. Audio is served from
 * Google's static dictionary CDN and sourced from Oxford Languages — real
 * human US-English speakers.
 *
 * Saves to public/audio/voice-samples/dictionary/<ID>.mp3
 *
 * NOTE: These files are Google/Oxford copyrighted audio. Use for
 * comparison/experiment only; we cannot redistribute in production.
 */

import { writeFile, mkdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const OUT_DIR = join(process.cwd(), 'public/audio/voice-samples/dictionary')

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

const WORDS: { id: string; word: string }[] = [
  { id: 'P',            word: 'pig' },
  { id: 'B',            word: 'bob' },
  { id: 'T',            word: 'two' },
  { id: 'D',            word: 'day' },
  { id: 'K',            word: 'kick' },
  { id: 'G',            word: 'go' },
  { id: 'M',            word: 'me' },
  { id: 'N',            word: 'nun' },
  { id: 'NG',           word: 'sing' },   // coda — English has no onset /ŋ/
  { id: 'H',            word: 'he' },
  { id: 'F',            word: 'fun' },
  { id: 'V',            word: 'van' },
  { id: 'S',            word: 'say' },
  { id: 'Z',            word: 'zoo' },
  { id: 'SH',           word: 'she' },
  { id: 'TH_VOICELESS', word: 'thin' },
  { id: 'TH_VOICED',    word: 'this' },
  { id: 'W',            word: 'wish' },
  { id: 'Y',            word: 'yard' },
  { id: 'L',            word: 'look' },
  { id: 'R',            word: 'red' },
  { id: 'CH',           word: 'chip' },
  { id: 'J',            word: 'juice' },
]

await mkdir(OUT_DIR, { recursive: true })

for (const { id, word } of WORDS) {
  const url = `https://ssl.gstatic.com/dictionary/static/sounds/20220808/${encodeURIComponent(word)}--_us_1.mp3`
  const outPath = join(OUT_DIR, `${id}.mp3`)

  try {
    const s = await stat(outPath)
    if (s.size > 1000) {
      console.log(`${id.padEnd(14)} "${word}" already present — skip`)
      continue
    }
  } catch {}

  process.stdout.write(`${id.padEnd(14)} "${word}" ... `)
  const res = await fetch(url)
  if (!res.ok) {
    console.log(`FAILED ${res.status}`)
    continue
  }
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(outPath, buf)
  console.log(`${(buf.length / 1024).toFixed(1)} KB`)
  await sleep(250)
}

console.log('\nDone.')
