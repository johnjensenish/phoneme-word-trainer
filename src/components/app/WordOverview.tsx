import { useMemo } from 'react'
import type { Tier, SoundOverride } from '~/data/types'
import { sounds } from '~/data/sounds'
import { words } from '~/data/words'
import { buildSoundsMap, computeWordTier } from '~/engine/tierComputation'
import { emojiMap } from '~/data/emojiMap'
import styles from './WordOverview.module.css'

interface WordOverviewProps {
  childAgeMonths: number
  soundOverrides: Map<string, SoundOverride>
}

const TIER_META: Record<Tier, { label: string; description: string; css: string }> = {
  1: { label: 'In reach', description: 'All sounds mastered', css: styles.tier1 },
  2: { label: 'Stretch', description: 'Emerging sounds', css: styles.tier2 },
  3: { label: 'Out of reach', description: 'Future sounds', css: styles.tier3 },
}

export function WordOverview({ childAgeMonths, soundOverrides }: WordOverviewProps) {
  const soundsMap = useMemo(() => buildSoundsMap(sounds), [])

  const grouped = useMemo(() => {
    const groups: Record<Tier, Array<{ word: string; emoji: string; category: string }>> = {
      1: [], 2: [], 3: [],
    }
    for (const w of words) {
      const tier = computeWordTier(w, soundsMap, childAgeMonths, soundOverrides)
      groups[tier].push({
        word: w.word,
        emoji: emojiMap[w.visual_hint] ?? '🔤',
        category: w.category,
      })
    }
    // Sort each group alphabetically
    for (const tier of [1, 2, 3] as Tier[]) {
      groups[tier].sort((a, b) => a.word.localeCompare(b.word))
    }
    return groups
  }, [soundsMap, childAgeMonths, soundOverrides])

  return (
    <div className={styles.container}>
      {([1, 2, 3] as Tier[]).map(tier => {
        const meta = TIER_META[tier]
        const group = grouped[tier]
        return (
          <div key={tier} className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={`${styles.badge} ${meta.css}`}>
                {group.length}
              </div>
              <div>
                <div className={styles.sectionTitle}>{meta.label}</div>
                <div className={styles.sectionDesc}>{meta.description}</div>
              </div>
            </div>
            <div className={styles.wordGrid}>
              {group.map(w => (
                <div key={w.word} className={`${styles.wordChip} ${meta.css}`}>
                  <span className="emoji">{w.emoji}</span>
                  <span className={styles.wordText}>{w.word}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
