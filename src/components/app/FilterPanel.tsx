import type { Tier } from '~/data/types'
import { ALL_CATEGORIES } from '~/engine/cardOrdering'
import styles from './FilterPanel.module.css'

interface FilterPanelProps {
  isOpen: boolean
  onClose: () => void
  selectedCategories: string[]
  onCategoryToggle: (category: string) => void
  selectedTiers: Tier[]
  onTierToggle: (tier: Tier) => void
  shuffle: boolean
  onShuffleToggle: () => void
}

const TIER_OPTIONS: { value: Tier; label: string; description: string }[] = [
  { value: 1, label: 'In reach', description: 'Sounds your child has mastered — encourage saying the word' },
  { value: 2, label: 'Stretch', description: 'Emerging sounds — model the word clearly, celebrate attempts' },
  { value: 3, label: 'Out of reach', description: 'Future sounds — just expose, no pressure to repeat' },
]

export function FilterPanel({
  isOpen, onClose, selectedCategories, onCategoryToggle,
  selectedTiers, onTierToggle, shuffle, onShuffleToggle
}: FilterPanelProps) {
  // Render a slide-in panel with category checkboxes, tier buttons, and a shuffle toggle
  // Use isOpen to control visibility via CSS class
  // Each category is a labeled checkbox
  // Tier is a row of toggle buttons
  // Shuffle is a simple toggle switch
  return (
    <>
      {isOpen && <div className={styles.backdrop} onClick={onClose} />}
      <aside className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Filters</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close filters">&times;</button>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Category</h3>
          <div className={styles.checkboxGroup}>
            {ALL_CATEGORIES.map(cat => (
              <label key={cat} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat)}
                  onChange={() => onCategoryToggle(cat)}
                  className={styles.checkbox}
                />
                <span className={styles.checkboxText}>{cat}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Practice mode</h3>
          <div className={styles.tierList}>
            {TIER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`${styles.tierItem} ${
                  selectedTiers.includes(opt.value) ? styles.tierItemActive : ''
                }`}
                onClick={() => onTierToggle(opt.value)}
              >
                <span className={styles.tierLabel}>{opt.label}</span>
                <span className={styles.tierDescription}>{opt.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.toggleLabel}>
            <span>Shuffle</span>
            <button
              className={`${styles.toggle} ${shuffle ? styles.toggleOn : ''}`}
              onClick={onShuffleToggle}
              role="switch"
              aria-checked={shuffle}
            >
              <span className={styles.toggleThumb} />
            </button>
          </label>
        </div>
      </aside>
    </>
  )
}
