import type { Sound, Word, Tier, DrillMode, SoundOverride } from '~/data/types'

/**
 * Compute the tier for a single sound given the child's age and any parent overrides.
 *
 * Tier 1 (Mastered): child_age >= mastery_months, or parent marked "mastered"
 * Tier 2 (Emerging): child_age >= onset_months
 * Tier 3 (Future):   child_age < onset_months, or parent marked "not-yet"
 */
export function computeSoundTier(
  sound: Sound,
  childAgeMonths: number,
  overrides: Map<string, SoundOverride>,
): Tier {
  const override = overrides.get(sound.sound_id)
  if (override === 'mastered') return 1
  if (override === 'not-yet') return 3
  // "age-based" or no override → use the timeline

  if (childAgeMonths >= sound.mastery_months) return 1
  if (childAgeMonths >= sound.onset_months) return 2
  return 3
}

/**
 * Compute the tier for a word. A word's tier = the highest (worst) tier
 * among all its constituent consonants AND clusters.
 *
 * Edge cases:
 * - Words with hardest_sound_id "—" (e.g., "uh-oh", "eye", "ow") have no
 *   consonants and are always Tier 1 — pure vowels any child can attempt.
 * - Cluster tier is checked independently of individual consonant tiers,
 *   because a cluster like BL is harder than B or L individually.
 * - Unknown sound IDs (not found in the sounds map) are silently skipped
 *   rather than crashing — defensive against data mismatches.
 */
export function computeWordTier(
  word: Word,
  soundsMap: Map<string, Sound>,
  childAgeMonths: number,
  overrides: Map<string, SoundOverride>,
): Tier {
  // Pure vowel words — always producible
  if (word.hardest_sound_id === '—') return 1

  let maxTier: Tier = 1

  // Check individual consonants
  for (const cid of word.consonant_ids) {
    const sound = soundsMap.get(cid)
    if (!sound) continue
    const tier = computeSoundTier(sound, childAgeMonths, overrides)
    if (tier > maxTier) maxTier = tier as Tier
  }

  // Check clusters separately — a cluster's timeline is independent of
  // its constituent sounds. BL at 36mo onset is Tier 3 for a 30mo child
  // even though B is Tier 1 and L is Tier 2.
  for (const clid of word.cluster_ids) {
    const cluster = soundsMap.get(clid)
    if (!cluster) continue
    const tier = computeSoundTier(cluster, childAgeMonths, overrides)
    if (tier > maxTier) maxTier = tier as Tier
  }

  return maxTier
}

/**
 * Map a computed tier to the drill approach.
 *
 * Tier 1 → "produce": Isolate phoneme, expect production.
 * Tier 2 → "guided":  Emphasize sound, model clearly, accept approximations.
 * Tier 3 → "expose":  Stretch sound in-word, auditory bombardment, celebrate any attempt.
 */
export function tierToDrillMode(tier: Tier): DrillMode {
  switch (tier) {
    case 1: return 'produce'
    case 2: return 'guided'
    case 3: return 'expose'
  }
}

/**
 * Build a lookup map from sound_id → Sound for efficient tier computation.
 */
export function buildSoundsMap(sounds: Sound[]): Map<string, Sound> {
  const map = new Map<string, Sound>()
  for (const s of sounds) {
    map.set(s.sound_id, s)
  }
  return map
}
