import { useState } from 'react'
import styles from './AgeEntry.module.css'

interface AgeEntryProps {
  onSubmit: (ageMonths: number) => void
}

export function AgeEntry({ onSubmit }: AgeEntryProps) {
  const [age, setAge] = useState(24)

  const ageLabel = age < 24
    ? `${age} months`
    : `${Math.floor(age / 12)} year${Math.floor(age / 12) > 1 ? 's' : ''}, ${age % 12} month${age % 12 !== 1 ? 's' : ''}`

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>How old is your child?</h1>
      <p className={styles.subtitle}>
        We'll match words and sounds to their developmental stage.
      </p>

      <div className={styles.sliderContainer}>
        <input
          type="range"
          min={12}
          max={60}
          value={age}
          onChange={(e) => setAge(Number(e.target.value))}
          className={styles.slider}
          aria-label="Child's age in months"
        />
        <div className={styles.ageDisplay}>{ageLabel}</div>
      </div>

      <button className={styles.startButton} onClick={() => onSubmit(age)}>
        Start practicing
      </button>
    </div>
  )
}
