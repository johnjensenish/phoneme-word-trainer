import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useEffect } from 'react'
import type { Tier, SoundOverride } from '~/data/types'
import { DEFAULT_FILTERS, type FilterState } from '~/engine/cardOrdering'
import { computeAgeMonths, formatAgeShort } from '~/engine/ageUtils'
import { useCards } from '~/hooks/useCards'
import { useAudio, usePrefetchAudio } from '~/hooks/useAudio'
import { useSwipe } from '~/hooks/useSwipe'
import { AgeEntry } from '~/components/app/AgeEntry'
import { Card } from '~/components/app/Card'
import { FilterPanel } from '~/components/app/FilterPanel'

export const Route = createFileRoute('/app')({
  component: AppRoute,
})

const STORAGE_KEY_BIRTH = 'phoneme-trainer-birth'
const STORAGE_KEY_OVERRIDES = 'phoneme-trainer-overrides'
const STORAGE_KEY_REACH = 'phoneme-trainer-reach'

interface BirthDate {
  month: number
  year: number
}

function loadBirth(): BirthDate | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY_BIRTH)
    if (!stored) return null
    const parsed = JSON.parse(stored)
    if (parsed && typeof parsed.month === 'number' && typeof parsed.year === 'number') {
      return parsed as BirthDate
    }
    return null
  } catch {
    return null
  }
}

function saveBirth(month: number, year: number) {
  localStorage.setItem(STORAGE_KEY_BIRTH, JSON.stringify({ month, year }))
}

function loadReach(): number {
  if (typeof window === 'undefined') return 0
  try {
    const stored = localStorage.getItem(STORAGE_KEY_REACH)
    return stored ? Number(stored) : 0
  } catch {
    return 0
  }
}

function saveReach(months: number) {
  localStorage.setItem(STORAGE_KEY_REACH, String(months))
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
  const [birthDate, setBirthDate] = useState<BirthDate | null>(null)
  const [birthLoaded, setBirthLoaded] = useState(false)
  const [reachMonths, setReachMonths] = useState(0)
  const [soundOverrides, setSoundOverrides] = useState<Map<string, SoundOverride>>(new Map())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [editingAge, setEditingAge] = useState(false)
  const [jumpTarget, setDevJumpTarget] = useState<string | null>(null)

  // Load persisted state on mount
  useEffect(() => {
    setBirthDate(loadBirth())
    setBirthLoaded(true)
    setSoundOverrides(loadOverrides())
    setReachMonths(loadReach())
  }, [])

  const baseAgeMonths = birthDate ? computeAgeMonths(birthDate.month, birthDate.year) : 24
  const childAgeMonths = baseAgeMonths + reachMonths

  // Compute cards
  const { cards, allCards, stats } = useCards({
    childAgeMonths,
    soundOverrides,
    filters,
  })

  // Dev mode: resolve pending jump-to-word after filters update
  useEffect(() => {
    if (!jumpTarget) return
    const idx = cards.findIndex(c =>
      c.word.word.toLowerCase() === jumpTarget || c.word.word.toLowerCase().startsWith(jumpTarget),
    )
    if (idx !== -1) setCurrentIndex(idx)
    setDevJumpTarget(null)
  }, [jumpTarget, cards])

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

  // Handle age submission
  const handleAgeSubmit = useCallback((birthMonth: number, birthYear: number, reach: number) => {
    saveBirth(birthMonth, birthYear)
    saveReach(reach)
    setBirthDate({ month: birthMonth, year: birthYear })
    setReachMonths(reach)
    setEditingAge(false)
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

  // Wait for localStorage to load before rendering
  if (!birthLoaded) return null

  // No birth date set, or editing → show age entry
  if (!birthDate || editingAge) {
    return (
      <AgeEntry
        onSubmit={handleAgeSubmit}
        initialBirthMonth={birthDate?.month}
        initialBirthYear={birthDate?.year}
        initialReach={reachMonths}
        soundOverrides={soundOverrides}
      />
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar — minimal, stays out of the way */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-md)',
        height: 'var(--nav-height)',
        flexShrink: 0,
      }}>
        <button
          onClick={() => setFilterOpen(true)}
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 10px',
            borderRadius: '10px',
            background: 'var(--color-surface-sunken)',
            transition: 'background 150ms ease',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="16" y2="12" />
            <line x1="4" y1="18" x2="12" y2="18" />
          </svg>
          Filter
          {stats.filtered < stats.total && (
            <span style={{
              background: 'var(--color-accent)',
              color: 'white',
              borderRadius: '8px',
              padding: '1px 6px',
              fontSize: '10px',
              fontWeight: 800,
            }}>
              {stats.filtered}
            </span>
          )}
        </button>

        <input
          type="text"
          placeholder={cards.length > 0 ? `${currentIndex + 1} / ${cards.length}` : '0 cards'}
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
            background: 'var(--color-surface-sunken)',
            border: 'none',
            borderRadius: '8px',
            padding: '6px 12px',
            width: '100px',
            textAlign: 'center',
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const input = e.target as HTMLInputElement
              const query = input.value.trim().toLowerCase()
              if (!query) return
              const match = (c: typeof cards[0]) =>
                c.word.word.toLowerCase() === query || c.word.word.toLowerCase().startsWith(query)
              const idx = cards.findIndex(match)
              if (idx !== -1) {
                setCurrentIndex(idx)
                input.value = ''
                input.blur()
                return
              }
              const allMatch = allCards.find(match)
              if (allMatch) {
                setFilters({ ...DEFAULT_FILTERS, tiers: [1, 2, 3], shuffle: false })
                setDevJumpTarget(allMatch.word.word.toLowerCase())
                input.value = ''
                input.blur()
              }
            }
          }}
        />

        <button
          onClick={() => setEditingAge(true)}
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            padding: '6px 10px',
            borderRadius: '10px',
            background: 'var(--color-surface-sunken)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {formatAgeShort(baseAgeMonths)}
          {reachMonths > 0 && (
            <span style={{
              color: 'var(--color-accent)',
              fontSize: '11px',
              fontWeight: 800,
            }}>
              +{reachMonths}
            </span>
          )}
        </button>
      </header>

      {/* Card area */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-sm) var(--space-md)',
        }}
      >
        {currentCard ? (
          <Card
            card={currentCard}
            onAudioPlay={speak}
            onPhonemePlay={speakPhoneme}
            onPrev={goPrev}
            onNext={goNext}
          />
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</p>
            <p>No cards match your filters.</p>
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              style={{
                marginTop: '12px',
                color: 'var(--color-accent)',
                fontWeight: 700,
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
