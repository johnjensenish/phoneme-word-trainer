import type { ComputedWordCard, DrillMode } from '~/data/types'
import { emojiMap } from '~/data/emojiMap'
import styles from './Card.module.css'

interface CardProps {
  card: ComputedWordCard
  onAudioPlay: (text: string) => void
}

const TIER_LABELS: Record<DrillMode, string> = {
  produce: 'Produce',
  guided: 'Guided',
  expose: 'Listen',
}

const TIER_STYLES: Record<DrillMode, string> = {
  produce: styles.tierProduce,
  guided: styles.tierGuided,
  expose: styles.tierExpose,
}

export function Card({ card, onAudioPlay }: CardProps) {
  const emoji = emojiMap[card.word.visual_hint] ?? '🔤'

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

        {/* Phoneme breakdown + audio */}
        <div className={styles.phonemeRow}>
          <button
            className={styles.audioButton}
            onClick={() => onAudioPlay(card.word.word)}
            aria-label={`Play pronunciation of ${card.word.word}`}
          >
            🔊
          </button>
          <span className={styles.phonemeText}>{card.phoneme_display}</span>
        </div>

        {/* Tier indicator */}
        <span className={`${styles.tier} ${TIER_STYLES[card.drill_mode]}`}>
          <span className={styles.tierDot} />
          {TIER_LABELS[card.drill_mode]}
        </span>
      </div>
    </div>
  )
}
