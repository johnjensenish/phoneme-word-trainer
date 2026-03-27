import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useEffect } from 'react'
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

const STORAGE_KEY_BIRTH = 'phoneme-trainer-birth'
const STORAGE_KEY_OVERRIDES = 'phoneme-trainer-overrides'

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

function computeAgeMonths(birth: BirthDate): number {
  const now = new Date()
  return (now.getFullYear() - birth.year) * 12 + (now.getMonth() + 1 - birth.month)
}

function formatAgeShort(months: number): string {
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m}m`
  if (m === 0) return `${y}y`
  return `${y}y ${m}m`
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
  }, [])

  const childAgeMonths = birthDate ? computeAgeMonths(birthDate) : 24

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

  // Keyboard controls removed — use on-screen buttons and swipe only

  // Handle age submission
  const handleAgeSubmit = useCallback((ageMonths: number, birthMonth: number, birthYear: number) => {
    saveBirth(birthMonth, birthYear)
    setBirthDate({ month: birthMonth, year: birthYear })
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
      />
    )
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

        <input
          type="text"
          placeholder={cards.length > 0 ? `${currentIndex + 1}/${cards.length} — jump to word` : '0 cards'}
          style={{
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            background: 'var(--color-surface-sunken)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            padding: '4px 8px',
            width: '160px',
            textAlign: 'center',
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const input = e.target as HTMLInputElement
              const query = input.value.trim().toLowerCase()
              if (!query) return
              const match = (c: typeof cards[0]) =>
                c.word.word.toLowerCase() === query || c.word.word.toLowerCase().startsWith(query)
              // Try filtered cards first
              const idx = cards.findIndex(match)
              if (idx !== -1) {
                setCurrentIndex(idx)
                input.value = ''
                input.blur()
                return
              }
              // Try all cards — clear filters & disable shuffle to show it
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
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-text-muted)',
          }}
        >
          ⚙ {formatAgeShort(childAgeMonths)}
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
          position: 'relative',
        }}
      >
        {currentCard ? (
          <>
            {/* Previous button */}
            <button
              onClick={goPrev}
              aria-label="Previous word"
              style={{
                position: 'absolute',
                left: 'max(8px, calc(50% - var(--card-max-width) / 2 - 52px))',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.06)',
                color: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 300,
                lineHeight: 1,
                transition: 'background 150ms ease, color 150ms ease',
                zIndex: 2,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.12)'
                e.currentTarget.style.color = 'var(--color-text)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.06)'
                e.currentTarget.style.color = 'var(--color-text-muted)'
              }}
            >
              ‹
            </button>

            <div style={{ width: '100%', maxWidth: 'var(--card-max-width)' }}>
              <Card
                card={currentCard}
                onAudioPlay={speak}
                onPhonemePlay={speakPhoneme}
              />
            </div>

            {/* Next button */}
            <button
              onClick={goNext}
              aria-label="Next word"
              style={{
                position: 'absolute',
                right: 'max(8px, calc(50% - var(--card-max-width) / 2 - 52px))',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.06)',
                color: 'var(--color-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 300,
                lineHeight: 1,
                transition: 'background 150ms ease, color 150ms ease',
                zIndex: 2,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.12)'
                e.currentTarget.style.color = 'var(--color-text)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(0,0,0,0.06)'
                e.currentTarget.style.color = 'var(--color-text-muted)'
              }}
            >
              ›
            </button>
          </>
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
