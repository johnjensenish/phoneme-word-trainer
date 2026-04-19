import { useState, useRef, useCallback, useEffect } from 'react'
import type { ComputedWordCard, Tier } from '~/data/types'
import { emojiMap } from '~/data/emojiMap'
import styles from './WordSearch.module.css'

interface WordSearchProps {
  allCards: ComputedWordCard[]
  filteredCards: ComputedWordCard[]
  currentIndex: number
  filteredCount: number
  onSelect: (card: ComputedWordCard, filteredIndex: number | null) => void
}

interface SearchResult {
  card: ComputedWordCard
  filteredIndex: number | null
  matchType: 'prefix' | 'contains' | 'category'
}

const TIER_LABELS: Record<Tier, string> = {
  1: 'In reach',
  2: 'Stretch',
  3: 'Out of reach',
}

function searchWords(
  query: string,
  allCards: ComputedWordCard[],
  filteredCards: ComputedWordCard[],
): SearchResult[] {
  if (!query) return []
  const q = query.toLowerCase()

  // Build a filtered index lookup
  const filteredIndexMap = new Map<string, number>()
  filteredCards.forEach((c, i) => filteredIndexMap.set(c.word.word, i))

  const prefix: SearchResult[] = []
  const contains: SearchResult[] = []
  const category: SearchResult[] = []

  for (const card of allCards) {
    const word = card.word.word.toLowerCase()
    const cat = card.word.category.toLowerCase()
    const filteredIndex = filteredIndexMap.get(card.word.word) ?? null

    if (word.startsWith(q)) {
      prefix.push({ card, filteredIndex, matchType: 'prefix' })
    } else if (word.includes(q)) {
      contains.push({ card, filteredIndex, matchType: 'contains' })
    } else if (cat.startsWith(q)) {
      category.push({ card, filteredIndex, matchType: 'category' })
    }
  }

  // Sort each group: in-filter first, then alphabetical
  const sort = (a: SearchResult, b: SearchResult) => {
    if (a.filteredIndex !== null && b.filteredIndex === null) return -1
    if (a.filteredIndex === null && b.filteredIndex !== null) return 1
    return a.card.word.word.localeCompare(b.card.word.word)
  }

  prefix.sort(sort)
  contains.sort(sort)
  category.sort(sort)

  return [...prefix, ...contains, ...category]
}

export function WordSearch({
  allCards, filteredCards, currentIndex, filteredCount, onSelect,
}: WordSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const results = searchWords(query, allCards, filteredCards)
  const visibleResults = results.slice(0, 20)

  const close = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setHighlightIndex(0)
    inputRef.current?.blur()
  }, [])

  const selectResult = useCallback((result: SearchResult) => {
    onSelect(result.card, result.filteredIndex)
    close()
  }, [onSelect, close])

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return
    const item = listRef.current.children[highlightIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [highlightIndex, isOpen])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen && e.key !== 'Escape') return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIndex(i => Math.min(i + 1, visibleResults.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (visibleResults[highlightIndex]) {
          selectResult(visibleResults[highlightIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        close()
        break
    }
  }, [isOpen, visibleResults, highlightIndex, selectResult, close])

  // Find divider positions between match types
  let lastMatchType: string | null = null

  return (
    <div className={styles.container}>
      <input
        ref={inputRef}
        type="text"
        className={styles.input}
        placeholder={filteredCount > 0 ? `${currentIndex + 1} / ${filteredCount}` : '0 cards'}
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          setIsOpen(e.target.value.length > 0)
          setHighlightIndex(0)
        }}
        onFocus={() => {
          if (query.length > 0) setIsOpen(true)
        }}
        onKeyDown={handleKeyDown}
        aria-label="Search words"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        role="combobox"
      />

      {isOpen && visibleResults.length > 0 && (
        <>
          <div className={styles.backdrop} onClick={close} />
          <div className={styles.dropdown} ref={listRef} role="listbox">
            {visibleResults.map((result, i) => {
              const showDivider = lastMatchType !== null && lastMatchType !== result.matchType
              lastMatchType = result.matchType
              const emoji = emojiMap[result.card.word.visual_hint] ?? '🔤'
              const isHighlighted = i === highlightIndex
              const isInFilter = result.filteredIndex !== null

              return (
                <button
                  key={result.card.word.word}
                  className={`${styles.result} ${isHighlighted ? styles.resultHighlighted : ''} ${showDivider ? styles.resultDivider : ''}`}
                  onClick={() => selectResult(result)}
                  onMouseEnter={() => setHighlightIndex(i)}
                  role="option"
                  aria-selected={isHighlighted}
                >
                  <span className="emoji" style={{ fontSize: '18px' }}>{emoji}</span>
                  <span className={styles.resultWord}>{result.card.word.word}</span>
                  {!isInFilter && (
                    <span className={styles.resultPinned}>pinned</span>
                  )}
                  <span
                    className={styles.tierDot}
                    data-tier={result.card.tier}
                    title={TIER_LABELS[result.card.tier]}
                  />
                </button>
              )
            })}
          </div>
        </>
      )}

      {isOpen && query.length > 0 && visibleResults.length === 0 && (
        <>
          <div className={styles.backdrop} onClick={close} />
          <div className={styles.dropdown}>
            <div className={styles.noResults}>No words match "{query}"</div>
          </div>
        </>
      )}
    </div>
  )
}
