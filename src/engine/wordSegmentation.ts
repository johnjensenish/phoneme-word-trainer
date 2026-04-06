import type { Tier } from '~/data/types'

export interface WordSegment {
  text: string
  soundId: string | null
  tier: Tier | null
}

/**
 * Maps sound_id → grapheme patterns to look for in the word spelling.
 * Ordered longest-first within each sound so digraphs match before singles.
 */
export const SOUND_GRAPHEMES: Record<string, string[]> = {
  CH: ['tch', 'ch'],
  SH: ['sh'],
  TH_VOICELESS: ['th'],
  TH_VOICED: ['th'],
  NG: ['ng'],
  K: ['ck', 'k', 'c'],
  S: ['ss', 'ce', 's', 'c'],
  Z: ['zz', 'z'],
  F: ['ff', 'ph', 'f'],
  L: ['ll', 'l'],
  R: ['rr', 'wr', 'r'],
  N: ['nn', 'kn', 'n'],
  M: ['mm', 'm'],
  B: ['bb', 'b'],
  D: ['dd', 'd'],
  G: ['gg', 'g'],
  P: ['pp', 'p'],
  T: ['tt', 't'],
  V: ['v'],
  W: ['w'],
  H: ['h'],
  J: ['dge', 'dg', 'ge', 'j'],
  Y: ['y'],
}

/**
 * Segment a word into letter groups, tagging consonant groups with their sound_id and tier.
 *
 * This is a best-effort heuristic — English spelling is irregular, but for the
 * common toddler vocabulary in this app it works well.
 */
export function segmentWord(
  word: string,
  consonantIds: string[],
  soundTiers: Record<string, Tier>,
): WordSegment[] {
  // Normalize: lowercase, strip hyphens for matching but we'll re-insert them
  const clean = word.toLowerCase()
  const segments: WordSegment[] = []

  // Build a queue of sounds to find, in order of position in word
  const soundQueue = [...consonantIds]
  // Deduplicate adjacent identical sounds (e.g., ["CH", "CH"] in "choo-choo")
  // but keep them if there are actually multiple occurrences in the word
  const soundsToFind: Array<{ soundId: string; grapheme: string; idx: number }> = []

  // For each sound, find its grapheme position in the word
  let searchFrom = 0
  for (const soundId of soundQueue) {
    const graphemes = SOUND_GRAPHEMES[soundId]
    if (!graphemes) continue

    let bestMatch: { grapheme: string; idx: number } | null = null
    for (const g of graphemes) {
      const idx = clean.indexOf(g, searchFrom)
      if (idx !== -1 && (!bestMatch || idx < bestMatch.idx)) {
        bestMatch = { grapheme: g, idx }
      }
    }
    if (bestMatch) {
      soundsToFind.push({ soundId, ...bestMatch })
      searchFrom = bestMatch.idx + bestMatch.grapheme.length
    }
  }

  // Sort by position in word
  soundsToFind.sort((a, b) => a.idx - b.idx)

  // Walk through the word, emitting segments
  let pos = 0
  for (const match of soundsToFind) {
    // Emit any vowel/unmatched chars before this consonant
    if (match.idx > pos) {
      segments.push({
        text: word.slice(pos, match.idx),
        soundId: null,
        tier: null,
      })
    }
    // Emit the consonant segment (preserve original casing from word)
    segments.push({
      text: word.slice(match.idx, match.idx + match.grapheme.length),
      soundId: match.soundId,
      tier: soundTiers[match.soundId] ?? null,
    })
    pos = match.idx + match.grapheme.length
  }

  // Emit any trailing chars
  if (pos < word.length) {
    segments.push({
      text: word.slice(pos),
      soundId: null,
      tier: null,
    })
  }

  return segments
}
