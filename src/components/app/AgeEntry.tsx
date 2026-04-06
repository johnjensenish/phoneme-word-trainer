import { useState, useMemo } from 'react'
import type { SoundOverride } from '~/data/types'
import { computeAgeMonths, formatAge } from '~/engine/ageUtils'
import { WordOverview } from './WordOverview'
import styles from './AgeEntry.module.css'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const MIN_AGE_MONTHS = 12
const MAX_AGE_MONTHS = 60

const REACH_OPTIONS = [
  { value: 0, label: 'On track' },
  { value: 3, label: '+3 mo' },
  { value: 6, label: '+6 mo' },
  { value: 9, label: '+9 mo' },
  { value: 12, label: '+12 mo' },
]

const EMPTY_OVERRIDES = new Map<string, SoundOverride>()

interface AgeEntryProps {
  onSubmit: (birthMonth: number, birthYear: number, reach: number) => void
  initialBirthMonth?: number
  initialBirthYear?: number
  initialReach?: number
  soundOverrides?: Map<string, SoundOverride>
}

export function AgeEntry({ onSubmit, initialBirthMonth, initialBirthYear, initialReach, soundOverrides }: AgeEntryProps) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const defaultMonth = initialBirthMonth ?? currentMonth
  const defaultYear = initialBirthYear ?? (currentYear - 2)

  const [birthMonth, setBirthMonth] = useState(defaultMonth)
  const [birthYear, setBirthYear] = useState(defaultYear)
  const [reach, setReach] = useState(initialReach ?? 0)

  const years = useMemo(() => {
    const result: number[] = []
    for (let y = currentYear; y >= currentYear - 6; y--) {
      result.push(y)
    }
    return result
  }, [currentYear])

  const ageMonths = computeAgeMonths(birthMonth, birthYear)
  const effectiveAge = ageMonths + reach
  const inRange = ageMonths >= MIN_AGE_MONTHS && ageMonths <= MAX_AGE_MONTHS
  const isFuture = ageMonths < 0

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>When was your child born?</h1>
      <p className={styles.subtitle}>
        We'll match words and sounds to their developmental stage.
      </p>

      <div className={styles.selectGroup}>
        <select
          value={birthMonth}
          onChange={(e) => setBirthMonth(Number(e.target.value))}
          className={styles.select}
          aria-label="Birth month"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={i + 1} value={i + 1}>{name}</option>
          ))}
        </select>

        <select
          value={birthYear}
          onChange={(e) => setBirthYear(Number(e.target.value))}
          className={styles.select}
          aria-label="Birth year"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className={styles.ageDisplay}>
        {isFuture
          ? "That's in the future!"
          : formatAge(ageMonths)}
      </div>

      {inRange && (
        <div className={styles.reachSection}>
          <p className={styles.reachLabel}>Ready for more?</p>
          <p className={styles.reachHint}>
            If your child is ahead, show words for older kids too.
          </p>
          <div className={styles.reachOptions}>
            {REACH_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`${styles.reachButton} ${reach === opt.value ? styles.reachButtonActive : ''}`}
                onClick={() => setReach(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {reach > 0 && (
            <p className={styles.reachEffect}>
              Showing words for {formatAge(effectiveAge).replace(' old', '')} level
            </p>
          )}
        </div>
      )}

      {!isFuture && !inRange && (
        <p className={styles.hint}>
          This app is designed for children 1-5 years old.
        </p>
      )}

      <button
        className={styles.startButton}
        disabled={!inRange}
        onClick={() => onSubmit(birthMonth, birthYear, reach)}
      >
        {initialBirthMonth ? 'Save changes' : 'Start practicing'}
      </button>

      {inRange && initialBirthMonth && (
        <div className={styles.overviewSection}>
          <h2 className={styles.overviewTitle}>Word overview</h2>
          <WordOverview
            childAgeMonths={effectiveAge}
            soundOverrides={soundOverrides ?? EMPTY_OVERRIDES}
          />
        </div>
      )}
    </div>
  )
}
