import type { ComputedWordCard, Tier, RhymeGroup } from '~/data/types'
import { rhymeGroups as staticRhymeGroups } from '~/data/rhymes'

// Pre-compute rhyme group lookup maps once at module load (static data)
const wordToGroup = new Map<string, string>()
const groupOrder = new Map<string, number>()
for (const [i, group] of staticRhymeGroups.entries()) {
  groupOrder.set(group.rhyme_group_id, i)
  for (const wid of group.word_ids) {
    wordToGroup.set(wid, group.rhyme_group_id)
  }
}

export const ALL_CATEGORIES = ['actions', 'animals', 'body', 'clothing', 'colors', 'describing', 'feelings', 'food', 'furniture', 'house', 'nature', 'numbers', 'people', 'shapes', 'spatial', 'time', 'toys', 'vehicles', 'weather'] as const

export interface FilterState {
  categories: string[]
  tiers: Tier[]
  targetSound: string | null
  wordTypes: string[]
  rhymeMode: boolean
  shuffle: boolean
}

export const DEFAULT_FILTERS: FilterState = {
  categories: [...ALL_CATEGORIES],
  tiers: [1, 2],
  targetSound: null,
  wordTypes: [],
  rhymeMode: false,
  shuffle: true,
}

/**
 * Filter and order computed word cards based on the current filter state.
 * Returns a new array (does not mutate the input).
 */
export function filterAndOrderCards(
  allCards: ComputedWordCard[],
  filters: FilterState,
): ComputedWordCard[] {
  let cards = allCards

  if (filters.categories.length > 0) {
    cards = cards.filter(c => filters.categories.includes(c.word.category))
  }

  if (filters.tiers.length > 0) {
    cards = cards.filter(c => filters.tiers.includes(c.tier))
  }

  if (filters.targetSound) {
    const sound = filters.targetSound
    cards = cards.filter(c =>
      c.word.consonant_ids.includes(sound) ||
      c.word.cluster_ids.includes(sound),
    )
  }

  if (filters.wordTypes.length > 0) {
    cards = cards.filter(c => filters.wordTypes.includes(c.word.word_type))
  }

  if (filters.rhymeMode) {
    cards = orderByRhymeGroups(cards)
  }

  if (filters.shuffle) {
    cards = shuffleArray(cards)
  }

  return cards
}

/**
 * Order cards by rhyme groups: cards in the same rhyme group appear
 * consecutively, with ungrouped cards at the end.
 * Uses module-level wordToGroup and groupOrder maps (pre-computed from static data).
 */
function orderByRhymeGroups(
  cards: ComputedWordCard[],
): ComputedWordCard[] {
  const grouped: ComputedWordCard[] = []
  const ungrouped: ComputedWordCard[] = []

  for (const card of cards) {
    const gid = wordToGroup.get(card.word.word_id)
    if (gid) {
      grouped.push(card)
    } else {
      ungrouped.push(card)
    }
  }

  // Sort grouped cards by their rhyme group order
  grouped.sort((a, b) => {
    const ga = wordToGroup.get(a.word.word_id) ?? ''
    const gb = wordToGroup.get(b.word.word_id) ?? ''
    return (groupOrder.get(ga) ?? 999) - (groupOrder.get(gb) ?? 999)
  })

  return [...grouped, ...ungrouped]
}

/**
 * Fisher-Yates shuffle. Returns a new array.
 */
function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
