import { Link } from '@tanstack/react-router'
import styles from './Hero.module.css'

export function Hero() {
  return (
    <section className={styles.hero}>
      <h1 className={styles.title}>
        Help your toddler{' '}
        <span className={styles.highlight}>hear</span> and{' '}
        <span className={styles.highlight}>say</span> new sounds
      </h1>
      <p className={styles.subtitle}>
        Age-matched flashcards with phoneme guides, so you know exactly how to
        model each word — and what to celebrate when they try.
      </p>
      <Link to="/app" className={styles.cta}>
        Start practicing
        <span aria-hidden="true">&rarr;</span>
      </Link>
      <span className={styles.badge}>
        Free &middot; No signup &middot; Based on speech science research
      </span>
    </section>
  )
}
