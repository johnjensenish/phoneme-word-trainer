import type { Tier } from '~/data/types'
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

const ALL_CATEGORIES = ['actions', 'animals', 'body', 'colors', 'describing', 'food', 'house', 'people', 'vehicles']
const TIER_OPTIONS: { value: Tier; label: string }[] = [
  { value: 1, label: 'Produce' },
  { value: 2, label: 'Guided' },
  { value: 3, label: 'Listen' },
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
                  checked={selectedCategories.length === 0 || selectedCategories.includes(cat)}
                  onChange={() => onCategoryToggle(cat)}
                  className={styles.checkbox}
                />
                <span className={styles.checkboxText}>{cat}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Tier</h3>
          <div className={styles.tierButtons}>
            {TIER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`${styles.tierButton} ${
                  selectedTiers.length === 0 || selectedTiers.includes(opt.value)
                    ? styles.tierButtonActive
                    : ''
                }`}
                onClick={() => onTierToggle(opt.value)}
              >
                {opt.label}
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
