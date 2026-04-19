import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useCallback, useRef } from 'react'
import styles from '~/components/voice-samples/VoiceSamples.module.css'

type Source = {
  id: string
  label: string
  sublabel: string
  urlFor: (phonemeId: string) => string
}

const SOURCES: Source[] = [
  {
    id: 'studio-o',
    label: 'Studio-O (current)',
    sublabel: 'Google TTS — generated',
    urlFor: id => `/audio/phonemes/${encodeURIComponent(id)}.mp3`,
  },
  {
    id: 'wikimedia',
    label: 'Wikimedia IPA',
    sublabel: 'Real human, bare IPA',
    urlFor: id => `/audio/voice-samples/wikimedia/${encodeURIComponent(id)}.mp3`,
  },
]

const PHONEMES = [
  { id: 'P', label: 'Puh', group: 'Stops' },
  { id: 'B', label: 'Buh', group: 'Stops' },
  { id: 'T', label: 'Tuh', group: 'Stops' },
  { id: 'D', label: 'Duh', group: 'Stops' },
  { id: 'K', label: 'Kuh', group: 'Stops' },
  { id: 'G', label: 'Guh', group: 'Stops' },
  { id: 'M', label: 'Mmm', group: 'Nasals' },
  { id: 'N', label: 'Nnn', group: 'Nasals' },
  { id: 'NG', label: 'Nng', group: 'Nasals' },
  { id: 'H', label: 'Hhh', group: 'Fricatives' },
  { id: 'F', label: 'Fff', group: 'Fricatives' },
  { id: 'V', label: 'Vvv', group: 'Fricatives' },
  { id: 'S', label: 'Sss', group: 'Fricatives' },
  { id: 'Z', label: 'Zzz', group: 'Fricatives' },
  { id: 'SH', label: 'Shh', group: 'Fricatives' },
  { id: 'TH_VOICELESS', label: 'Thh (voiceless)', group: 'Fricatives' },
  { id: 'TH_VOICED', label: 'Thh (voiced)', group: 'Fricatives' },
  { id: 'W', label: 'Wuh', group: 'Glides' },
  { id: 'Y', label: 'Yuh', group: 'Glides' },
  { id: 'L', label: 'Lll', group: 'Liquids' },
  { id: 'R', label: 'Rrr', group: 'Liquids' },
  { id: 'CH', label: 'Chuh', group: 'Affricates' },
  { id: 'J', label: 'Juh', group: 'Affricates' },
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
          <strong>About the samples.</strong> The &ldquo;Wikimedia IPA&rdquo;
          column pulls from Wikipedia&apos;s IPA consonant chart recordings.
          These are authentic human recordings, but: speakers are mixed (not
          all female, not PNW-specific), and the sound is usually the bare IPA
          phoneme (e.g. just <em>p</em>), not the &ldquo;puh&rdquo;
          consonant-plus-schwa we use in training. It&apos;s a starting point
          for the experiment — we can source better samples (e.g. a recorded
          PNW female voice talent) if this direction feels right.
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
                    return (
                      <button
                        key={key}
                        className={`${styles.playBtn} ${playing === key ? styles.playing : ''}`}
                        onClick={() => play(s.id, p.id, s.urlFor(p.id))}
                        aria-label={`Play ${p.id} from ${s.label}`}
                      >
                        {playing === key ? '⏹' : '▶'}
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
        Wikimedia samples are sourced from the{' '}
        <a
          href="https://en.wikipedia.org/wiki/IPA_consonant_chart_with_audio"
          target="_blank"
          rel="noreferrer"
        >
          IPA consonant chart with audio
        </a>{' '}
        on Wikipedia, licensed under CC&nbsp;BY-SA. Transcoded from OGG to MP3
        by Wikimedia Commons.
      </div>
    </div>
  )
}
