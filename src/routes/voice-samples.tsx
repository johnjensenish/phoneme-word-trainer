import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useCallback, useRef } from 'react'
import styles from '~/components/voice-samples/VoiceSamples.module.css'

type Source = {
  id: string
  label: string
  sublabel: string
  urlFor: (phoneme: Phoneme) => string
  captionFor?: (phoneme: Phoneme) => string
}

type Phoneme = {
  id: string
  label: string
  group: string
  /** Example English word used for the Dictionary column. */
  dictWord: string
}

const SOURCES: Source[] = [
  {
    id: 'studio-o',
    label: 'Studio-O (current)',
    sublabel: 'Google TTS — generated',
    urlFor: p => `/audio/phonemes/${encodeURIComponent(p.id)}.mp3`,
  },
  {
    id: 'wikimedia',
    label: 'Wikimedia IPA',
    sublabel: 'Mixed speakers, bare IPA',
    urlFor: p => `/audio/voice-samples/wikimedia/${encodeURIComponent(p.id)}.mp3`,
  },
  {
    id: 'dictionary',
    label: 'Oxford / Google Dict.',
    sublabel: 'US speaker, example word',
    urlFor: p => `/audio/voice-samples/dictionary/${encodeURIComponent(p.id)}.mp3`,
    captionFor: p => `"${p.dictWord}"`,
  },
]

const PHONEMES: Phoneme[] = [
  { id: 'P',            label: 'Puh',             group: 'Stops',      dictWord: 'pig' },
  { id: 'B',            label: 'Buh',             group: 'Stops',      dictWord: 'bob' },
  { id: 'T',            label: 'Tuh',             group: 'Stops',      dictWord: 'two' },
  { id: 'D',            label: 'Duh',             group: 'Stops',      dictWord: 'day' },
  { id: 'K',            label: 'Kuh',             group: 'Stops',      dictWord: 'kick' },
  { id: 'G',            label: 'Guh',             group: 'Stops',      dictWord: 'go' },
  { id: 'M',            label: 'Mmm',             group: 'Nasals',     dictWord: 'me' },
  { id: 'N',            label: 'Nnn',             group: 'Nasals',     dictWord: 'nun' },
  { id: 'NG',           label: 'Nng',             group: 'Nasals',     dictWord: 'sing' },
  { id: 'H',            label: 'Hhh',             group: 'Fricatives', dictWord: 'he' },
  { id: 'F',            label: 'Fff',             group: 'Fricatives', dictWord: 'fun' },
  { id: 'V',            label: 'Vvv',             group: 'Fricatives', dictWord: 'van' },
  { id: 'S',            label: 'Sss',             group: 'Fricatives', dictWord: 'say' },
  { id: 'Z',            label: 'Zzz',             group: 'Fricatives', dictWord: 'zoo' },
  { id: 'SH',           label: 'Shh',             group: 'Fricatives', dictWord: 'she' },
  { id: 'TH_VOICELESS', label: 'Thh (voiceless)', group: 'Fricatives', dictWord: 'thin' },
  { id: 'TH_VOICED',    label: 'Thh (voiced)',    group: 'Fricatives', dictWord: 'this' },
  { id: 'W',            label: 'Wuh',             group: 'Glides',     dictWord: 'wish' },
  { id: 'Y',            label: 'Yuh',             group: 'Glides',     dictWord: 'yard' },
  { id: 'L',            label: 'Lll',             group: 'Liquids',    dictWord: 'look' },
  { id: 'R',            label: 'Rrr',             group: 'Liquids',    dictWord: 'red' },
  { id: 'CH',           label: 'Chuh',            group: 'Affricates', dictWord: 'chip' },
  { id: 'J',            label: 'Juh',             group: 'Affricates', dictWord: 'juice' },
]

export const Route = createFileRoute('/voice-samples')({
  component: VoiceSamplesPage,
})

function VoiceSamplesPage() {
  const [playing, setPlaying] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const play = useCallback(
    (sourceId: string, phonemeId: string, url: string) => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      const key = `${sourceId}/${phonemeId}`
      if (playing === key) {
        setPlaying(null)
        return
      }

      const audio = new Audio(url)
      audioRef.current = audio
      setPlaying(key)
      audio.addEventListener('ended', () => setPlaying(null))
      audio.addEventListener('error', () => setPlaying(null))
      audio.play().catch(() => setPlaying(null))
    },
    [playing],
  )

  const groups: { name: string; phonemes: typeof PHONEMES }[] = []
  for (const p of PHONEMES) {
    let g = groups.find(x => x.name === p.group)
    if (!g) {
      g = { name: p.group, phonemes: [] }
      groups.push(g)
    }
    g.phonemes.push(p)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Human vs Generated Phonemes</h1>
        <p>
          Tap a row to compare our current generated phoneme against a real
          human recording of the same IPA sound.
        </p>
        <div className={styles.note}>
          <strong>About the samples.</strong> Neither human source is a PNW
          female voice — we&apos;d need to record one. What&apos;s here is two
          different free real-human sources, so you can judge whether real
          audio wins clearly enough to be worth the effort.
          <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
            <li>
              <strong>Wikimedia IPA</strong> — mixed volunteer speakers from
              the <a href="https://en.wikipedia.org/wiki/IPA_consonant_chart_with_audio" target="_blank" rel="noreferrer">IPA consonant chart</a>,
              isolated bare phonemes (e.g. just <em>p</em>, not <em>puh</em>).
              CC BY-SA.
            </li>
            <li>
              <strong>Oxford / Google Dictionary</strong> — US-English speaker,
              full example word (e.g. <em>pig</em> for P). Real dictionary
              audio, but whole-word rather than isolated phoneme, and
              Google/Oxford copyright so redistribution-restricted.
            </li>
          </ul>
        </div>
      </header>

      <div className={styles.content}>
        {groups.map(group => (
          <div key={group.name} className={styles.group}>
            <h2 className={styles.groupTitle}>{group.name}</h2>
            <div
              className={styles.grid}
              style={{ gridTemplateColumns: `150px repeat(${SOURCES.length}, 1fr)` }}
            >
              <div className={styles.colHeader} />
              {SOURCES.map(s => (
                <div key={s.id} className={styles.colHeader}>
                  <div>{s.label}</div>
                  <div style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, marginTop: 2 }}>
                    {s.sublabel}
                  </div>
                </div>
              ))}

              {group.phonemes.map(p => (
                <React.Fragment key={p.id}>
                  <div className={styles.rowLabel}>
                    <strong>{p.id}</strong>
                    <span>{p.label}</span>
                  </div>
                  {SOURCES.map(s => {
                    const key = `${s.id}/${p.id}`
                    const caption = s.captionFor?.(p)
                    return (
                      <button
                        key={key}
                        className={`${styles.playBtn} ${playing === key ? styles.playing : ''}`}
                        onClick={() => play(s.id, p.id, s.urlFor(p))}
                        aria-label={`Play ${p.id} from ${s.label}${caption ? ` — ${caption}` : ''}`}
                      >
                        <span>{playing === key ? '⏹' : '▶'}</span>
                        {caption && <span className={styles.caption}>{caption}</span>}
                      </button>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <div>
          <strong>Wikimedia IPA</strong> — sourced from the{' '}
          <a
            href="https://en.wikipedia.org/wiki/IPA_consonant_chart_with_audio"
            target="_blank"
            rel="noreferrer"
          >
            IPA consonant chart with audio
          </a>{' '}
          on Wikipedia. CC&nbsp;BY-SA. Transcoded to MP3 by Wikimedia Commons.
        </div>
        <div style={{ marginTop: 8 }}>
          <strong>Oxford / Google Dictionary</strong> — audio served from{' '}
          <code>ssl.gstatic.com/dictionary</code> (real human US-English
          speaker, Oxford Languages). Included here for
          comparison/evaluation; not cleared for redistribution.
        </div>
      </div>
    </div>
  )
}
