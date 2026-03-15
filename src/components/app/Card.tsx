import type { ComputedWordCard, DrillMode } from '~/data/types'
import { PHONEME_LABELS } from '~/engine/drillMode'
import { emojiMap } from '~/data/emojiMap'
import styles from './Card.module.css'

interface CardProps {
  card: ComputedWordCard
  onAudioPlay: (wordId: string) => void
  onPhonemePlay: (soundId: string) => void
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

export function Card({ card, onAudioPlay, onPhonemePlay }: CardProps) {
  const emoji = emojiMap[card.word.visual_hint] ?? '🔤'

  // Show the hardest sound as a playable pill, falling back to first consonant
  const phonemeSoundId =
    card.word.hardest_sound_id !== '—' ? card.word.hardest_sound_id
    : card.word.consonant_ids[0] ?? null
  const phonemeLabel = phonemeSoundId ? PHONEME_LABELS[phonemeSoundId] : null

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

        {/* Audio controls */}
        <div className={styles.audioRow}>
          <button
            className={styles.audioButton}
            onClick={() => onAudioPlay(card.word.word_id)}
            aria-label={`Play pronunciation of ${card.word.word}`}
          >
            🔊 Word
          </button>
          {phonemeLabel && phonemeSoundId && (
            <button
              className={styles.phonemePill}
              onClick={() => onPhonemePlay(phonemeSoundId)}
              aria-label={`Play isolated ${phonemeLabel} sound`}
            >
              🔉 {phonemeLabel}
            </button>
          )}
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
