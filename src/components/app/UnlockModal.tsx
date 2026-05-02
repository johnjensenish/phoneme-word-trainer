import { useState, useEffect, useRef } from 'react'
import styles from './UnlockModal.module.css'

interface UnlockModalProps {
  isOpen: boolean
  onUnlock: () => void
  onClose: () => void
}

interface Problem {
  a: number
  b: number
}

function newProblem(): Problem {
  const a = 1 + Math.floor(Math.random() * 5)
  const b = 1 + Math.floor(Math.random() * 5)
  return { a, b }
}

export function UnlockModal({ isOpen, onUnlock, onClose }: UnlockModalProps) {
  const [problem, setProblem] = useState<Problem>(() => newProblem())
  const [answer, setAnswer] = useState('')
  const [wrong, setWrong] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setProblem(newProblem())
    setAnswer('')
    setWrong(false)
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (Number(answer) === problem.a + problem.b) {
      onUnlock()
      return
    }
    setWrong(true)
    setProblem(newProblem())
    setAnswer('')
    inputRef.current?.focus()
  }

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="unlock-title"
      >
        <h2 id="unlock-title" className={styles.title}>Parent check</h2>
        <p className={styles.subtitle}>Solve to unlock controls</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={`${styles.problem} ${wrong ? styles.shake : ''}`}>
            <span>{problem.a}</span>
            <span className={styles.op}>+</span>
            <span>{problem.b}</span>
            <span className={styles.op}>=</span>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={answer}
              onChange={e => {
                const next = e.target.value.replace(/\D/g, '')
                setAnswer(next)
                setWrong(false)
                if (next && Number(next) === problem.a + problem.b) {
                  onUnlock()
                }
              }}
              className={styles.input}
              aria-label="Answer"
              maxLength={2}
              autoComplete="off"
            />
          </div>
          <p className={styles.error}>{wrong ? 'Not quite — try this one' : ' '}</p>
          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancel}>
              Cancel
            </button>
            <button type="submit" className={styles.submit} disabled={!answer}>
              Unlock
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
