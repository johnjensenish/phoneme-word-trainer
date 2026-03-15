import type { ComputedWordCard, DrillMode } from '~/data/types'
import { getTargetSoundId } from '~/engine/drillMode'
import { emojiMap } from '~/data/emojiMap'
import styles from './Card.module.css'

interface CardProps {
  card: ComputedWordCard
  onAudioPlay: (wordId: string) => void
  onDisplayPlay: (soundId: string, wordId: string) => void
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

export function Card({ card, onAudioPlay, onDisplayPlay }: CardProps) {
  const emoji = emojiMap[card.word.visual_hint] ?? '🔤'

  const handleDisplayPlay = () => {
    const soundId = getTargetSoundId(card.word, card.drill_mode)
    if (soundId) {
      onDisplayPlay(soundId, card.word.word_id)
    } else {
      onAudioPlay(card.word.word_id)
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

        {/* Phoneme breakdown + audio */}
        <div className={styles.phonemeRow}>
          <button
            className={styles.audioButton}
            onClick={() => onAudioPlay(card.word.word_id)}
            aria-label={`Play pronunciation of ${card.word.word}`}
          >
            🔊
          </button>
          <button
            className={styles.phonemeText}
            onClick={handleDisplayPlay}
            aria-label={`Play phoneme breakdown for ${card.word.word}`}
          >
            {card.phoneme_display}
          </button>
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
