import type { Word, PhonologicalProcess } from '~/data/types'

/**
 * Predict what a child might say when attempting a word, given their active
 * phonological processes.
 *
 * This is the most linguistically complex part of the app. Phonological
 * processes are simplification patterns that children naturally use — they're
 * not errors, they're developmental. The predicted approximation helps parents
 * know what to expect and celebrate appropriate attempts.
 *
 * Process application order matters:
 * 1. Cluster reduction (removes sounds from clusters)
 * 2. Fronting (K→T, G→D)
 * 3. Stopping (fricatives → stops)
 * 4. Gliding (L→W, R→W)
 * 5. Final consonant deletion (drops final consonant)
 * 6. Weak syllable deletion (drops unstressed syllable)
 * 7. Assimilation, reduplication, voicing, deaffrication
 *
 * We apply at most one or two dominant processes to keep the prediction
 * readable and useful. Real speech may layer more processes, but showing
 * "the most likely simplification" is more helpful than a maximally reduced form.
 */

/**
 * Substitution rules for each process that changes individual sounds.
 */
const FRONTING_MAP: Record<string, string> = {
  K: 'T', G: 'D',
  k: 't', g: 'd',
}

const STOPPING_MAP: Record<string, string> = {
  F: 'P', S: 'T', Z: 'D', V: 'B',
  SH: 'T', TH_VOICELESS: 'T', TH_VOICED: 'D',
  f: 'p', s: 't', z: 'd', v: 'b',
}

const GLIDING_MAP: Record<string, string> = {
  L: 'W', R: 'W',
  l: 'w', r: 'w',
}

/**
 * Given a word and a set of active (expected) phonological processes,
 * return the predicted child approximation as a string.
 *
 * Examples:
 * - "cat" + [fronting] → "tat"
 * - "blue" + [cluster_red] → "boo"
 * - "frog" + [cluster_red, fronting] → "dog" (cluster reduces FR→F→ wait, actually FR→F, then f→p? No.)
 *   Actually: "frog" + cluster_red → "fog" (FR reduces to F), then fronting → "fod" (G→D)
 *   But that's unusual. Let's keep it simple: "frog" → "fog" (cluster reduction is the dominant process)
 * - "red" + [gliding] → "wed"
 * - "dog" + [final_c_del] → "dah"
 * - "banana" + [weak_syl_del] → "nana"
 * - "stop" + [cluster_red] → "top"
 */
export function predictApproximation(
  word: Word,
  activeProcesses: PhonologicalProcess[],
): string {
  // No consonants → child says it as-is
  if (word.hardest_sound_id === '—') return word.word

  // No active processes → child says it correctly
  if (activeProcesses.length === 0) return word.word

  const activeIds = new Set(activeProcesses.map(p => p.process_id))
  let result = word.word.toLowerCase()

  // 1. Cluster reduction — remove the harder element from initial clusters
  if (activeIds.has('cluster_red') && word.cluster_ids.length > 0) {
    result = applyClusterReduction(result, word)
  }

  // 2. Fronting — K→T, G→D
  if (activeIds.has('fronting')) {
    result = applySubstitution(result, word, FRONTING_MAP, ['K', 'G'])
  }

  // 3. Stopping — fricatives → stops
  if (activeIds.has('stopping')) {
    result = applySubstitution(result, word, STOPPING_MAP,
      ['F', 'S', 'Z', 'V', 'SH', 'TH_VOICELESS', 'TH_VOICED'])
  }

  // 4. Gliding — L→W, R→W
  if (activeIds.has('gliding')) {
    result = applySubstitution(result, word, GLIDING_MAP, ['L', 'R'])
  }

  // 5. Final consonant deletion
  if (activeIds.has('final_c_del')) {
    result = applyFinalConsonantDeletion(result, word)
  }

  // 6. Weak syllable deletion
  if (activeIds.has('weak_syl_del') && word.syllable_count > 1) {
    result = applyWeakSyllableDeletion(result, word)
  }

  return result
}

/**
 * Cluster reduction: remove the more complex element from an initial cluster.
 * BL → B, FR → F, ST → T, TR → T, etc.
 *
 * The general rule: in a stop+liquid cluster, keep the stop. In an /s/+stop
 * cluster, keep the stop. In a stop+glide cluster, keep the stop.
 */
function applyClusterReduction(text: string, word: Word): string {
  // Map of cluster → what it reduces to (the character(s) kept)
  const reductions: Record<string, string> = {
    BL: 'b', BR: 'b', PL: 'p', PR: 'p',
    TR: 't', DR: 'd', KR: 'k', GR: 'g',
    FR: 'f', FL: 'f', GL: 'g',
    SP: 'p', ST: 't', SK: 'k',
    SN: 'n', SW: 'w', SL: 'l',
  }

  let result = text
  for (const clusterId of word.cluster_ids) {
    const reduced = reductions[clusterId]
    if (!reduced) continue

    // Find the cluster characters in the word and replace with the reduced form
    const clusterChars = clusterId.toLowerCase()
    const idx = result.indexOf(clusterChars)
    if (idx !== -1) {
      result = result.slice(0, idx) + reduced + result.slice(idx + clusterChars.length)
    }
  }

  return result
}

/**
 * Apply a sound substitution process (fronting, stopping, gliding).
 * Only substitute sounds that are actually in this word's consonant list.
 */
function applySubstitution(
  text: string,
  word: Word,
  subMap: Record<string, string>,
  targetSoundIds: string[],
): string {
  let result = text

  for (const soundId of targetSoundIds) {
    // Only apply if this word actually contains this sound
    if (!word.consonant_ids.includes(soundId)) continue

    const replacement = subMap[soundId.toLowerCase()] ?? subMap[soundId]
    if (!replacement) continue

    // Map sound_id to the characters in the written word
    const soundChars = soundIdToChars(soundId)
    if (!soundChars) continue

    // Replace first occurrence
    const idx = result.indexOf(soundChars)
    if (idx !== -1) {
      result = result.slice(0, idx) + replacement + result.slice(idx + soundChars.length)
    }
  }

  return result
}

/**
 * Final consonant deletion: drop the last consonant sound from the word.
 * "dog" → "dah", "cat" → "cah"
 *
 * We find the last consonant character(s) and remove them, potentially
 * adding 'h' or 'ah' to keep it pronounceable.
 */
function applyFinalConsonantDeletion(text: string, word: Word): string {
  // Find the last consonant position
  const lastPos = word.consonant_positions.lastIndexOf('final')
  if (lastPos === -1) return text

  const lastConsonantId = word.consonant_ids[lastPos]
  if (!lastConsonantId) return text

  const chars = soundIdToChars(lastConsonantId)
  if (!chars) return text

  // Remove from the end of the word
  if (text.endsWith(chars)) {
    return text.slice(0, -chars.length)
  }

  return text
}

/**
 * Weak syllable deletion: drop the unstressed first syllable.
 * "banana" → "nana", "away" → "way"
 *
 * Heuristic: if the word has 2+ syllables and starts with an unstressed
 * syllable (common in English: ba-NA-na, a-GAIN), drop up to the first
 * vowel cluster.
 */
function applyWeakSyllableDeletion(text: string, word: Word): string {
  // Common weak-initial patterns
  const weakPrefixes = [
    /^ba/, /^be/, /^a/, /^to/, /^po/,
  ]

  for (const pattern of weakPrefixes) {
    if (pattern.test(text) && text.length > 3) {
      // Find the second syllable onset (next consonant after first vowel)
      const match = text.match(/^[^aeiou]*[aeiou]+/)
      if (match && match[0].length < text.length) {
        return text.slice(match[0].length)
      }
    }
  }

  return text
}

/**
 * Map a sound_id to the character(s) it represents in written English.
 * This is imperfect — English spelling is notoriously inconsistent —
 * but covers the words in our curated dataset well.
 */
const SOUND_ID_TO_CHARS: Record<string, string> = {
  P: 'p', B: 'b', M: 'm', N: 'n', H: 'h', W: 'w',
  D: 'd', Y: 'y', G: 'g', K: 'k', T: 't', F: 'f',
  NG: 'ng', S: 's', Z: 'z', L: 'l', R: 'r',
  SH: 'sh', CH: 'ch', J: 'j', V: 'v',
  TH_VOICELESS: 'th', TH_VOICED: 'th',
}

function soundIdToChars(soundId: string): string | null {
  return SOUND_ID_TO_CHARS[soundId] ?? null
}

/**
 * Get the list of phonological processes that are active (expected/normal)
 * for a child of the given age.
 */
export function getActiveProcesses(
  allProcesses: PhonologicalProcess[],
  childAgeMonths: number,
): PhonologicalProcess[] {
  return allProcesses.filter(p => childAgeMonths < p.resolves_by_months)
}

/**
 * Get processes that are specifically relevant to a given word —
 * i.e., processes that would actually change how this word is produced.
 */
export function getRelevantProcesses(
  word: Word,
  activeProcesses: PhonologicalProcess[],
): PhonologicalProcess[] {
  return activeProcesses.filter(process => {
    switch (process.process_id) {
      case 'cluster_red':
        return word.cluster_ids.length > 0
      case 'fronting':
        return word.consonant_ids.some(id => id === 'K' || id === 'G')
      case 'stopping':
        return word.consonant_ids.some(id =>
          ['F', 'S', 'Z', 'V', 'SH', 'TH_VOICELESS', 'TH_VOICED'].includes(id))
      case 'gliding':
        return word.consonant_ids.some(id => id === 'L' || id === 'R')
      case 'final_c_del':
        return word.consonant_positions.includes('final')
      case 'weak_syl_del':
        return word.syllable_count > 1
      case 'assimilation':
        // Could affect any CVC word — but hard to predict. Flag if multiple consonants.
        return word.consonant_ids.length >= 2
      case 'reduplication':
        return word.syllable_count > 1
      case 'voicing':
        return word.consonant_ids.some(id => ['P', 'T', 'K'].includes(id)) &&
          word.consonant_positions[0] === 'initial'
      case 'deaffrication':
        return word.consonant_ids.some(id => id === 'CH' || id === 'J')
      default:
        return false
    }
  })
}
