import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useCallback, useRef } from 'react'
import styles from '~/components/voice-test/VoiceTest.module.css'

const VOICES = [
  { name: 'en-US-Studio-O', label: 'Studio-O (current)' },
  { name: 'en-US-Studio-Q', label: 'Studio-Q' },
  { name: 'en-US-Neural2-C', label: 'Neural2-C' },
  { name: 'en-US-Neural2-F', label: 'Neural2-F' },
  { name: 'en-US-Wavenet-F', label: 'Wavenet-F' },
  { name: 'en-US-Wavenet-C', label: 'Wavenet-C' },
  { name: 'en-US-News-K', label: 'News-K' },
  { name: 'en-US-Casual-K', label: 'Casual-K' },
  { name: 'en-US-Casual-K-padded', label: 'Casual-K (padded)' },
  { name: 'en-US-Casual-K-slow', label: 'Casual-K (slow)' },
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

const WORDS = [
  'up', 'ball', 'cat', 'fish', 'red',
  'three', 'that', 'rabbit', 'strawberry', 'sandwich',
]

export const Route = createFileRoute('/voice-test')({
  component: VoiceTestPage,
})

function VoiceTestPage() {
  const [selectedVoices, setSelectedVoices] = useState<Set<string>>(
    () => new Set(['en-US-Studio-O', 'en-US-Casual-K']),
  )
  const [tab, setTab] = useState<'phonemes' | 'words'>('phonemes')
  const [playing, setPlaying] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const toggleVoice = (name: string) => {
    setSelectedVoices(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const play = useCallback((voice: string, type: 'phonemes' | 'words', id: string) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    const key = `${voice}/${type}/${id}`
    if (playing === key) {
      setPlaying(null)
      return
    }

    // Studio-O production audio lives at /audio/phonemes/ and /audio/words/
    const url = voice === 'en-US-Studio-O'
      ? `/audio/${type}/${encodeURIComponent(id)}.mp3`
      : `/audio/voice-experiments/${voice}/${type}/${encodeURIComponent(id)}.mp3`
    const audio = new Audio(url)
    audioRef.current = audio
    setPlaying(key)
    audio.addEventListener('ended', () => setPlaying(null))
    audio.addEventListener('error', () => setPlaying(null))
    audio.play().catch(() => setPlaying(null))
  }, [playing])

  const activeVoices = VOICES.filter(v => selectedVoices.has(v.name))

  // Group phonemes
  const groups: { name: string; phonemes: typeof PHONEMES }[] = []
  for (const p of PHONEMES) {
    let g = groups.find(x => x.name === p.group)
    if (!g) { g = { name: p.group, phonemes: [] }; groups.push(g) }
    g.phonemes.push(p)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Voice Comparison</h1>
        <p>Pick voices to compare, then tap to play each phoneme or word.</p>
      </header>

      <section className={styles.voicePicker}>
        {VOICES.map(v => (
          <button
            key={v.name}
            className={`${styles.voiceChip} ${selectedVoices.has(v.name) ? styles.active : ''}`}
            onClick={() => toggleVoice(v.name)}
          >
            {v.label}
          </button>
        ))}
      </section>

      <nav className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'phonemes' ? styles.activeTab : ''}`}
          onClick={() => setTab('phonemes')}
        >
          Phonemes
        </button>
        <button
          className={`${styles.tab} ${tab === 'words' ? styles.activeTab : ''}`}
          onClick={() => setTab('words')}
        >
          Words
        </button>
      </nav>

      {activeVoices.length === 0 && (
        <p className={styles.empty}>Select at least one voice above.</p>
      )}

      {tab === 'phonemes' && activeVoices.length > 0 && (
        <div className={styles.content}>
          {groups.map(group => (
            <div key={group.name} className={styles.group}>
              <h2 className={styles.groupTitle}>{group.name}</h2>
              <div className={styles.grid} style={{ gridTemplateColumns: `120px repeat(${activeVoices.length}, 1fr)` }}>
                <div className={styles.colHeader} />
                {activeVoices.map(v => (
                  <div key={v.name} className={styles.colHeader}>{v.label}</div>
                ))}

                {group.phonemes.map(p => (
                  <React.Fragment key={p.id}>
                    <div className={styles.rowLabel}>
                      <strong>{p.id}</strong>
                      <span>{p.label}</span>
                    </div>
                    {activeVoices.map(v => {
                      const key = `${v.name}/phonemes/${p.id}`
                      return (
                        <button
                          key={key}
                          className={`${styles.playBtn} ${playing === key ? styles.playing : ''}`}
                          onClick={() => play(v.name, 'phonemes', p.id)}
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
      )}

      {tab === 'words' && activeVoices.length > 0 && (
        <div className={styles.content}>
          <div className={styles.grid} style={{ gridTemplateColumns: `120px repeat(${activeVoices.length}, 1fr)` }}>
            <div className={styles.colHeader} />
            {activeVoices.map(v => (
              <div key={v.name} className={styles.colHeader}>{v.label}</div>
            ))}

            {WORDS.map(word => (
              <React.Fragment key={word}>
                <div className={styles.rowLabel}>
                  <strong>{word}</strong>
                </div>
                {activeVoices.map(v => {
                  const key = `${v.name}/words/${word}`
                  return (
                    <button
                      key={key}
                      className={`${styles.playBtn} ${playing === key ? styles.playing : ''}`}
                      onClick={() => play(v.name, 'words', word)}
                    >
                      {playing === key ? '⏹' : '▶'}
                    </button>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
