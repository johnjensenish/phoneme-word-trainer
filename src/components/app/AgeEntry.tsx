import { useState, useMemo } from 'react'
import styles from './AgeEntry.module.css'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const MIN_AGE_MONTHS = 12
const MAX_AGE_MONTHS = 60

function computeAgeMonths(birthMonth: number, birthYear: number): number {
  const now = new Date()
  return (now.getFullYear() - birthYear) * 12 + (now.getMonth() + 1 - birthMonth)
}

function formatAge(months: number): string {
  if (months < 24) return `${months} months old`
  const y = Math.floor(months / 12)
  const m = months % 12
  if (m === 0) return `${y} year${y > 1 ? 's' : ''} old`
  return `${y} year${y > 1 ? 's' : ''}, ${m} month${m !== 1 ? 's' : ''} old`
}

interface AgeEntryProps {
  onSubmit: (ageMonths: number, birthMonth: number, birthYear: number) => void
  initialBirthMonth?: number
  initialBirthYear?: number
}

export function AgeEntry({ onSubmit, initialBirthMonth, initialBirthYear }: AgeEntryProps) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const defaultMonth = initialBirthMonth ?? currentMonth
  const defaultYear = initialBirthYear ?? (currentYear - 2)

  const [birthMonth, setBirthMonth] = useState(defaultMonth)
  const [birthYear, setBirthYear] = useState(defaultYear)

  const years = useMemo(() => {
    const result: number[] = []
    for (let y = currentYear; y >= currentYear - 6; y--) {
      result.push(y)
    }
    return result
  }, [currentYear])

  const ageMonths = computeAgeMonths(birthMonth, birthYear)
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

      {!isFuture && !inRange && (
        <p className={styles.hint}>
          This app is designed for children 1–5 years old.
        </p>
      )}

      <button
        className={styles.startButton}
        disabled={!inRange}
        onClick={() => onSubmit(ageMonths, birthMonth, birthYear)}
      >
        Start practicing
      </button>
    </div>
  )
}
