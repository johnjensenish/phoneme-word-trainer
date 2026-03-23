import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useEffect, useRef } from 'react'
import type { Tier, SoundOverride } from '~/data/types'
import { DEFAULT_FILTERS, type FilterState } from '~/engine/cardOrdering'
import { useCards } from '~/hooks/useCards'
import { useAudio, usePrefetchAudio } from '~/hooks/useAudio'
import { useSwipe } from '~/hooks/useSwipe'
import { AgeEntry } from '~/components/app/AgeEntry'
import { Card } from '~/components/app/Card'
import { FilterPanel } from '~/components/app/FilterPanel'

export const Route = createFileRoute('/app')({
  component: AppRoute,
})

const STORAGE_KEY_AGE = 'phoneme-trainer-age'
const STORAGE_KEY_OVERRIDES = 'phoneme-trainer-overrides'

function loadAge(): number | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(STORAGE_KEY_AGE)
  return stored ? Number(stored) : null
}

function saveAge(age: number) {
  localStorage.setItem(STORAGE_KEY_AGE, String(age))
}

function loadOverrides(): Map<string, SoundOverride> {
  if (typeof window === 'undefined') return new Map()
  try {
    const stored = localStorage.getItem(STORAGE_KEY_OVERRIDES)
    if (!stored) return new Map()
    return new Map(JSON.parse(stored))
  } catch {
    return new Map()
  }
}

function saveOverrides(overrides: Map<string, SoundOverride>) {
  localStorage.setItem(
    STORAGE_KEY_OVERRIDES,
    JSON.stringify([...overrides.entries()]),
  )
}

function AppRoute() {
  const [childAgeMonths, setChildAgeMonths] = useState<number | null>(null)
  const [soundOverrides, setSoundOverrides] = useState<Map<string, SoundOverride>>(new Map())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)

  // Load persisted state on mount
  useEffect(() => {
    setChildAgeMonths(loadAge())
    setSoundOverrides(loadOverrides())
  }, [])

  // Compute cards
  const { cards, stats } = useCards({
    childAgeMonths: childAgeMonths ?? 24,
    soundOverrides,
    filters,
  })

  const { speak, speakPhoneme } = useAudio()

  const goNext = useCallback(() => {
    setCurrentIndex(i => (cards.length > 0 ? (i + 1) % cards.length : 0))
  }, [cards.length])

  const goPrev = useCallback(() => {
    setCurrentIndex(i => (cards.length > 0 ? (i - 1 + cards.length) % cards.length : 0))
  }, [cards.length])

  const { containerRef } = useSwipe({
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
  })

  // Keyboard: space for audio (stabilized with ref to avoid re-registering on every navigation)
  const stateRef = useRef({ cards, currentIndex })
  useEffect(() => { stateRef.current = { cards, currentIndex } }, [cards, currentIndex])
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { cards: c, currentIndex: i } = stateRef.current
      if (e.key === ' ' && c.length > 0) {
        e.preventDefault()
        const card = c[i]
        if (card) speak(card.word.word)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [speak])

  // Handle age submission
  const handleAgeSubmit = useCallback((age: number) => {
    setChildAgeMonths(age)
    saveAge(age)
    setCurrentIndex(0)
  }, [])

  // Filter handlers
  const handleCategoryToggle = useCallback((category: string) => {
    setFilters(f => {
      const cats = f.categories.includes(category)
        ? f.categories.filter(c => c !== category)
        : [...f.categories, category]
      return { ...f, categories: cats }
    })
    setCurrentIndex(0)
  }, [])

  const handleTierToggle = useCallback((tier: Tier) => {
    setFilters(f => {
      const tiers = f.tiers.includes(tier)
        ? f.tiers.filter(t => t !== tier)
        : [...f.tiers, tier]
      return { ...f, tiers: tiers as Tier[] }
    })
    setCurrentIndex(0)
  }, [])

  const handleShuffleToggle = useCallback(() => {
    setFilters(f => ({ ...f, shuffle: !f.shuffle }))
    setCurrentIndex(0)
  }, [])

  const currentCard = cards[currentIndex]
  usePrefetchAudio(currentCard)

  // Age not set → show age entry
  if (childAgeMonths === null) {
    return <AgeEntry onSubmit={handleAgeSubmit} />
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Top bar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--space-sm) var(--space-md)',
        height: 'var(--nav-height)',
      }}>
        <button
          onClick={() => setFilterOpen(true)}
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>☰</span> Filter
          {stats.filtered < stats.total && (
            <span style={{
              background: 'var(--color-accent)',
              color: 'white',
              borderRadius: '10px',
              padding: '1px 6px',
              fontSize: '11px',
              marginLeft: '4px',
            }}>
              {stats.filtered}
            </span>
          )}
        </button>

        <span style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--color-text-light)',
        }}>
          {cards.length > 0 ? `${currentIndex + 1} / ${cards.length}` : '0 cards'}
        </span>

        <button
          onClick={() => setChildAgeMonths(null)}
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
          }}
        >
          ⚙ {childAgeMonths}mo
        </button>
      </header>

      {/* Card area */}
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - var(--nav-height) - 40px)',
          padding: 'var(--space-md)',
        }}
      >
        {currentCard ? (
          <div style={{ width: '100%', maxWidth: 'var(--card-max-width)' }}>
            <Card
              card={currentCard}
              onAudioPlay={speak}
              onPhonemePlay={speakPhoneme}
            />
            <p style={{
              textAlign: 'center',
              color: 'var(--color-text-light)',
              fontSize: 'var(--font-size-xs)',
              marginTop: 'var(--space-md)',
            }}>
              ← swipe or use arrow keys →
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</p>
            <p>No cards match your filters.</p>
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              style={{
                marginTop: '12px',
                color: 'var(--color-accent)',
                fontWeight: 600,
              }}
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Filter panel */}
      <FilterPanel
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        selectedCategories={filters.categories}
        onCategoryToggle={handleCategoryToggle}
        selectedTiers={filters.tiers}
        onTierToggle={handleTierToggle}
        shuffle={filters.shuffle}
        onShuffleToggle={handleShuffleToggle}
      />
    </div>
  )
}
