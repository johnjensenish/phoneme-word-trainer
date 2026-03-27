import type { ComputedWordCard, Tier } from '~/data/types'
import { PHONEME_LABELS } from '~/engine/drillMode'
import { emojiMap } from '~/data/emojiMap'
import styles from './Card.module.css'

interface CardProps {
  card: ComputedWordCard
  onAudioPlay: (word: string) => void
  onPhonemePlay: (soundId: string) => void
}

/** Inline SVG speaker icon — small, crisp, no emoji jank. */
function SpeakerIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

const TIER_PILL_STYLES: Record<Tier, string> = {
  1: styles.phonemeTier1,
  2: styles.phonemeTier2,
  3: styles.phonemeTier3,
}

export function Card({ card, onAudioPlay, onPhonemePlay }: CardProps) {
  const emoji = emojiMap[card.word.visual_hint] ?? '🔤'

  // Deduplicate consonant_ids while preserving order (show each sound once)
  const uniqueSounds: string[] = []
  const seen = new Set<string>()
  for (const cid of card.word.consonant_ids) {
    if (!seen.has(cid)) {
      seen.add(cid)
      uniqueSounds.push(cid)
    }
  }

  return (
    <div className={styles.card}>
      {/* Image area */}
      <div className={styles.imageArea}>
        <span className="emoji" role="img" aria-label={card.word.visual_hint}>
          {emoji}
        </span>
      </div>

      {/* Content area */}
      <div className={styles.content}>
        {/* Word */}
        <div className={styles.word}>{card.word.word}</div>

        {/* Phoneme display text */}
        <div className={styles.phonemeText}>{card.phoneme_display}</div>

        {/* Word audio button — primary action */}
        <button
          className={styles.wordButton}
          onClick={() => onAudioPlay(card.word.word)}
          aria-label={`Play pronunciation of ${card.word.word}`}
        >
          <SpeakerIcon size={18} />
          <span>Hear it</span>
        </button>

        {/* Phoneme pills — one per unique consonant, colored by tier */}
        {uniqueSounds.length > 0 && (
          <div className={styles.phonemeRow}>
            {uniqueSounds.map(soundId => {
              const label = PHONEME_LABELS[soundId]
              if (!label) return null
              const tier = card.soundTiers[soundId] ?? 2
              return (
                <button
                  key={soundId}
                  className={`${styles.phonemePill} ${TIER_PILL_STYLES[tier]}`}
                  onClick={() => onPhonemePlay(soundId)}
                  aria-label={`Play ${label} sound (${tier === 1 ? 'mastered' : tier === 2 ? 'emerging' : 'future'})`}
                >
                  <SpeakerIcon size={12} />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
