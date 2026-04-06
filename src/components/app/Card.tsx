import type { ComputedWordCard, Tier } from '~/data/types'
import { PHONEME_LABELS, generateCoachingTip } from '~/engine/drillMode'
import { segmentWord } from '~/engine/wordSegmentation'
import { emojiMap } from '~/data/emojiMap'
import styles from './Card.module.css'

interface CardProps {
  card: ComputedWordCard
  onAudioPlay: (word: string) => void
  onPhonemePlay: (soundId: string) => void
  onPrev: () => void
  onNext: () => void
}

function SpeakerIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

const TIER_CLASSES: Record<Tier, string> = {
  1: styles.tier1,
  2: styles.tier2,
  3: styles.tier3,
}

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      {direction === 'left'
        ? <polyline points="15 18 9 12 15 6" />
        : <polyline points="9 6 15 12 9 18" />}
    </svg>
  )
}

export function Card({ card, onAudioPlay, onPhonemePlay, onPrev, onNext }: CardProps) {
  const emoji = emojiMap[card.word.visual_hint] ?? '🔤'

  const segments = segmentWord(
    card.word.word,
    card.word.consonant_ids,
    card.soundTiers,
  )

  const coachingTip = generateCoachingTip(card.word, card.drill_mode)

  return (
    <div className={styles.card}>
      <div className={styles.imageArea}>
        <span className="emoji" role="img" aria-label={card.word.visual_hint}>
          {emoji}
        </span>
        <span className={styles.imageLabel}>{card.word.word}</span>
      </div>

      <div className={styles.content}>
        <div className={styles.wordRow}>
          {segments.map((seg, i) => (
            <span
              key={i}
              className={`${styles.letterGroup} ${seg.soundId ? styles.letterGroupConsonant : styles.letterGroupVowel} ${seg.tier ? TIER_CLASSES[seg.tier] : ''}`}
              onClick={seg.soundId ? () => onPhonemePlay(seg.soundId!) : undefined}
              role={seg.soundId ? 'button' : undefined}
              tabIndex={seg.soundId ? 0 : undefined}
              aria-label={seg.soundId ? `Play ${PHONEME_LABELS[seg.soundId]} sound` : undefined}
            >
              {seg.text}
            </span>
          ))}
        </div>

        <button
          className={styles.hearItButton}
          onClick={() => onAudioPlay(card.word.word)}
          aria-label={`Play pronunciation of ${card.word.word}`}
        >
          <SpeakerIcon size={20} />
          <span>Listen</span>
        </button>

        {coachingTip && (
          <p className={styles.tipText}>{coachingTip}</p>
        )}

        <div className={styles.actionBar}>
          <button className={styles.navButton} onClick={onPrev} aria-label="Previous word">
            <ArrowIcon direction="left" />
          </button>
          <button className={styles.navButton} onClick={onNext} aria-label="Next word">
            <ArrowIcon direction="right" />
          </button>
        </div>
      </div>
    </div>
  )
}
