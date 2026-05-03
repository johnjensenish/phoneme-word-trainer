import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useEffect, useRef } from 'react'
import type { Tier, SoundOverride, ComputedWordCard } from '~/data/types'
import { DEFAULT_FILTERS, type FilterState } from '~/engine/cardOrdering'
import { computeAgeMonths, formatAgeShort } from '~/engine/ageUtils'
import { useCards } from '~/hooks/useCards'
import { useAudio, usePrefetchAudio } from '~/hooks/useAudio'
import { AgeEntry } from '~/components/app/AgeEntry'
import { Card } from '~/components/app/Card'
import { FilterPanel } from '~/components/app/FilterPanel'
import { UnlockModal } from '~/components/app/UnlockModal'
import { WordSearch } from '~/components/app/WordSearch'
import styles from './app.module.css'

export const Route = createFileRoute('/app')({
  component: AppRoute,
})

const STORAGE_KEY_BIRTH = 'phoneme-trainer-birth'
const STORAGE_KEY_OVERRIDES = 'phoneme-trainer-overrides'
const STORAGE_KEY_REACH = 'phoneme-trainer-reach'
const STORAGE_KEY_TODDLER = 'phoneme-trainer-toddler-mode'

const TODDLER_COOLDOWN_MS = 600

interface BirthDate {
  month: number
  year: number
}

function readStorage<T>(key: string, decode: (raw: string) => T | null, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = localStorage.getItem(key)
    if (stored === null) return fallback
    const decoded = decode(stored)
    return decoded ?? fallback
  } catch {
    return fallback
  }
}

function loadBirth(): BirthDate | null {
  return readStorage<BirthDate | null>(STORAGE_KEY_BIRTH, raw => {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.month === 'number' && typeof parsed.year === 'number') {
      return parsed as BirthDate
    }
    return null
  }, null)
}

function saveBirth(month: number, year: number) {
  localStorage.setItem(STORAGE_KEY_BIRTH, JSON.stringify({ month, year }))
}

function loadReach(): number {
  return readStorage(STORAGE_KEY_REACH, raw => Number(raw), 0)
}

function saveReach(months: number) {
  localStorage.setItem(STORAGE_KEY_REACH, String(months))
}

function loadOverrides(): Map<string, SoundOverride> {
  return readStorage(STORAGE_KEY_OVERRIDES, raw => new Map(JSON.parse(raw)) as Map<string, SoundOverride>, new Map())
}

function saveOverrides(overrides: Map<string, SoundOverride>) {
  localStorage.setItem(
    STORAGE_KEY_OVERRIDES,
    JSON.stringify([...overrides.entries()]),
  )
}

function loadToddlerMode(): boolean {
  return readStorage(STORAGE_KEY_TODDLER, raw => raw === '1', false)
}

function saveToddlerMode(on: boolean) {
  if (on) localStorage.setItem(STORAGE_KEY_TODDLER, '1')
  else localStorage.removeItem(STORAGE_KEY_TODDLER)
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
  const [pinnedCard, setPinnedCard] = useState<ComputedWordCard | null>(null)
  const [toddlerMode, setToddlerMode] = useState(false)
  const [unlockOpen, setUnlockOpen] = useState(false)
  const [cooldownLocked, setCooldownLocked] = useState(false)
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load persisted state on mount
  useEffect(() => {
    setBirthDate(loadBirth())
    setBirthLoaded(true)
    setSoundOverrides(loadOverrides())
    setReachMonths(loadReach())
    setToddlerMode(loadToddlerMode())
  }, [])

  const enableToddlerMode = useCallback(() => {
    setFilterOpen(false)
    setToddlerMode(true)
    saveToddlerMode(true)
  }, [])

  const handleUnlock = useCallback(() => {
    setToddlerMode(false)
    saveToddlerMode(false)
    setUnlockOpen(false)
  }, [])

  // Brief cooldown after each tap in toddler mode to prevent button-mashing.
  useEffect(() => {
    if (!toddlerMode) setCooldownLocked(false)
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current)
        cooldownTimerRef.current = null
      }
    }
  }, [toddlerMode])
  const triggerCooldown = useCallback(() => {
    setCooldownLocked(true)
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
    cooldownTimerRef.current = setTimeout(() => setCooldownLocked(false), TODDLER_COOLDOWN_MS)
  }, [])
  const guard = useCallback(<A extends unknown[]>(fn: (...args: A) => void) => (...args: A) => {
    if (toddlerMode && cooldownLocked) return
    fn(...args)
    if (toddlerMode) triggerCooldown()
  }, [toddlerMode, cooldownLocked, triggerCooldown])

  const baseAgeMonths = birthDate ? computeAgeMonths(birthDate.month, birthDate.year) : 24
  const childAgeMonths = baseAgeMonths + reachMonths

  // Compute cards
  const { cards, allCards, stats } = useCards({
    childAgeMonths,
    soundOverrides,
    filters,
  })

  const { speak, speakPhoneme } = useAudio()

  const goNext = useCallback(() => {
    setPinnedCard(null)
    setCurrentIndex(i => (cards.length > 0 ? (i + 1) % cards.length : 0))
  }, [cards.length])

  const goPrev = useCallback(() => {
    setPinnedCard(null)
    setCurrentIndex(i => (cards.length > 0 ? (i - 1 + cards.length) % cards.length : 0))
  }, [cards.length])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate when typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev])

  const handleSearchSelect = useCallback((card: ComputedWordCard, filteredIndex: number | null) => {
    if (filteredIndex !== null) {
      setPinnedCard(null)
      setCurrentIndex(filteredIndex)
    } else {
      setPinnedCard(card)
    }
  }, [])

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

  const currentCard = pinnedCard ?? cards[currentIndex]
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

  const cooldownActive = toddlerMode && cooldownLocked

  return (
    <div
      style={{
        height: '100svh',
        overflow: 'hidden',
        background: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
        ...(toddlerMode && {
          userSelect: 'none' as const,
          WebkitUserSelect: 'none' as const,
          WebkitTouchCallout: 'none' as const,
          WebkitTapHighlightColor: 'transparent',
        }),
      }}
    >
      {/* Top bar — minimal, stays out of the way */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: toddlerMode ? 'flex-end' : 'space-between',
        padding: '0 var(--space-md)',
        height: 'var(--nav-height)',
        flexShrink: 0,
      }}>
        {!toddlerMode && (
          <button onClick={() => setFilterOpen(true)} className={styles.headerChip}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="16" y2="12" />
              <line x1="4" y1="18" x2="12" y2="18" />
            </svg>
            Filter
            {stats.filtered < stats.total && (
              <span className={styles.headerChipBadge}>{stats.filtered}</span>
            )}
          </button>
        )}

        {!toddlerMode && (
          <WordSearch
            allCards={allCards}
            filteredCards={cards}
            currentIndex={currentIndex}
            filteredCount={cards.length}
            onSelect={handleSearchSelect}
          />
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {!toddlerMode && (
            <button onClick={() => setEditingAge(true)} className={styles.headerChip}>
              {formatAgeShort(baseAgeMonths)}
              {reachMonths > 0 && (
                <span className={styles.headerChipReach}>+{reachMonths}</span>
              )}
            </button>
          )}

          <button
            onClick={toddlerMode ? () => setUnlockOpen(true) : enableToddlerMode}
            aria-label={toddlerMode ? 'Unlock parental controls' : 'Enter toddler mode'}
            title={toddlerMode ? 'Unlock parental controls' : 'Enter toddler mode'}
            className={`${styles.headerIconButton} ${toddlerMode ? styles.headerIconButtonActive : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              {toddlerMode ? (
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              ) : (
                <path d="M8 11V7a4 4 0 0 1 8 0" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Card area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'center',
          minHeight: 0,
        }}
      >
        {currentCard ? (
          <Card
            card={currentCard}
            onAudioPlay={guard(speak)}
            onPhonemePlay={guard(speakPhoneme)}
            onPrev={guard(goPrev)}
            onNext={guard(goNext)}
            cooldownActive={cooldownActive}
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

      <UnlockModal
        isOpen={unlockOpen}
        onUnlock={handleUnlock}
        onClose={() => setUnlockOpen(false)}
      />
    </div>
  )
}
