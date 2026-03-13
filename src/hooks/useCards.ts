import { useMemo } from 'react'
import type { ComputedWordCard, SoundOverride, Tier } from '~/data/types'
import { sounds } from '~/data/sounds'
import { words } from '~/data/words'
import { processes } from '~/data/processes'
import {
  buildSoundsMap,
  computeWordTier,
  tierToDrillMode,
} from '~/engine/tierComputation'
import { generatePhonemeDisplay } from '~/engine/drillMode'
import {
  getActiveProcesses,
  getRelevantProcesses,
  predictApproximation,
} from '~/engine/approximation'
import { filterAndOrderCards, type FilterState } from '~/engine/cardOrdering'

interface UseCardsOptions {
  childAgeMonths: number
  soundOverrides: Map<string, SoundOverride>
  filters: FilterState
}

/**
 * Main hook: computes all word cards with tiers, drill modes, phoneme displays,
 * and expected approximations — then filters and orders them.
 */
export function useCards({ childAgeMonths, soundOverrides, filters }: UseCardsOptions) {
  const soundsMap = useMemo(() => buildSoundsMap(sounds), [])

  const activeProcesses = useMemo(
    () => getActiveProcesses(processes, childAgeMonths),
    [childAgeMonths],
  )

  const allCards: ComputedWordCard[] = useMemo(() => {
    return words.map(word => {
      const tier = computeWordTier(word, soundsMap, childAgeMonths, soundOverrides)
      const drill_mode = tierToDrillMode(tier)
      const phoneme_display = generatePhonemeDisplay(word, drill_mode)
      const relevantProcesses = getRelevantProcesses(word, activeProcesses)
      const expected_approximation = predictApproximation(word, relevantProcesses)

      return {
        word,
        tier,
        drill_mode,
        phoneme_display,
        expected_approximation,
        active_processes: relevantProcesses,
      }
    })
  }, [soundsMap, childAgeMonths, soundOverrides, activeProcesses])

  const filteredCards = useMemo(
    () => filterAndOrderCards(allCards, filters),
    [allCards, filters],
  )

  // Stats for the filter panel
  const stats = useMemo(() => {
    const tierCounts: Record<Tier, number> = { 1: 0, 2: 0, 3: 0 }
    for (const card of allCards) {
      tierCounts[card.tier]++
    }
    return {
      total: allCards.length,
      filtered: filteredCards.length,
      tierCounts,
    }
  }, [allCards, filteredCards])

  return { cards: filteredCards, stats }
}
