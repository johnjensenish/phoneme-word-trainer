import styles from './Methodology.module.css'

export function Methodology() {
  return (
    <>
      {/* ─── How It Works ──────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>How it works</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.stepNumber}>1</span>
            <h3 className={styles.stepTitle}>Enter your child's age</h3>
            <p className={styles.stepDesc}>
              The app uses speech sound acquisition research to compute which
              sounds your child has mastered, which are emerging, and which are
              coming later.
            </p>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>2</span>
            <h3 className={styles.stepTitle}>See age-matched cards</h3>
            <p className={styles.stepDesc}>
              Each card shows a word with a picture, a phoneme guide for you to
              read, and a color-coded tier so you know the right approach.
            </p>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>3</span>
            <h3 className={styles.stepTitle}>Model and celebrate</h3>
            <p className={styles.stepDesc}>
              You say the word, your child tries it. Green words they can
              produce. Amber words you model carefully. Pink words — just let
              them hear it.
            </p>
          </div>
        </div>

        {/* ─── Tier explanation ─────────────────────────────────────── */}
        <div className={styles.tierPreview}>
          <div className={`${styles.tierCard} ${styles.tierCardProduce}`}>
            <div>
              <span className={`${styles.tierDot} ${styles.tierDotProduce}`} />
              <span className={styles.tierLabel}>Produce</span>
            </div>
            <p className={styles.tierDesc}>
              Your child can make this sound. Isolate the first phoneme, then
              blend: "Buh &middot; Ball."
            </p>
          </div>
          <div className={`${styles.tierCard} ${styles.tierCardGuided}`}>
            <div>
              <span className={`${styles.tierDot} ${styles.tierDotGuided}`} />
              <span className={styles.tierLabel}>Guided</span>
            </div>
            <p className={styles.tierDesc}>
              This sound is emerging. Model with emphasis: "Kuh... Cat!" Accept
              approximations — "tat" is great.
            </p>
          </div>
          <div className={`${styles.tierCard} ${styles.tierCardExpose}`}>
            <div>
              <span className={`${styles.tierDot} ${styles.tierDotExpose}`} />
              <span className={styles.tierLabel}>Listen</span>
            </div>
            <p className={styles.tierDesc}>
              Not expected yet. Stretch the sound: "Bllllue." Your child will
              simplify, and that's perfectly normal.
            </p>
          </div>
        </div>
      </section>

      {/* ─── The Science ───────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.science}>
          <h3 className={styles.scienceTitle}>Built on speech science</h3>
          <ul className={styles.scienceList}>
            <li className={styles.scienceItem}>
              Based on speech sound acquisition timelines from Crowe & McLeod
              (2020) — the most comprehensive review of children's English
              consonant development.
            </li>
            <li className={styles.scienceItem}>
              212 words tagged by constituent consonant sounds, acquisition
              difficulty, and common simplification patterns.
            </li>
            <li className={styles.scienceItem}>
              Uses recasting — modeling the correct form without correcting —
              which research shows is the most effective parent technique for
              speech development.
            </li>
            <li className={styles.scienceItem}>
              Phonological processes like fronting ("cat" → "tat") and cluster
              reduction ("blue" → "boo") are normal. The app expects and
              explains them.
            </li>
          </ul>
        </div>
      </section>
    </>
  )
}
