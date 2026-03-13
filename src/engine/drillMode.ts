import type { Word, DrillMode } from '~/data/types'

/**
 * Speakable phoneme labels for each sound_id.
 * Used to generate the phoneme breakdown line on each card.
 *
 * Design decisions:
 * - Stops (P, B, T, D, K, G) get a schwa: "Puh", "Buh" — because you can't
 *   hold a stop, the release + schwa is how parents naturally isolate them.
 * - Continuants (fricatives, liquids, nasals) get stretched: "Sss", "Lll", "Mmm"
 *   — these can be held, so stretching is more natural than adding schwa.
 * - Affricates get schwa: "Chuh", "Juh" — the stop onset prevents stretching.
 * - Clusters use the onset phoneme label: BL → "Buh-lll" would be confusing,
 *   so we use the first element's label for display.
 */
export const PHONEME_LABELS: Record<string, string> = {
  // Stops — schwa release
  P: 'Puh',
  B: 'Buh',
  T: 'Tuh',
  D: 'Duh',
  K: 'Kuh',
  G: 'Guh',

  // Nasals — stretchable
  M: 'Mmm',
  N: 'Nnn',
  NG: 'Nng',

  // Fricatives — stretchable
  H: 'Hhh',
  F: 'Fff',
  V: 'Vvv',
  S: 'Sss',
  Z: 'Zzz',
  SH: 'Shh',
  TH_VOICELESS: 'Thh',
  TH_VOICED: 'Thh',

  // Glides — brief stretch
  W: 'Wuh',
  Y: 'Yuh',

  // Liquids — stretchable
  L: 'Lll',
  R: 'Rrr',

  // Affricates — schwa release
  CH: 'Chuh',
  J: 'Juh',
}

/**
 * Sounds that can be phonetically sustained (held continuously).
 * Stops and affricates cannot — they require a burst of air.
 */
const CONTINUANTS = new Set([
  'S', 'Z', 'F', 'V', 'SH', 'TH_VOICELESS', 'TH_VOICED',
  'L', 'R', 'M', 'N', 'NG', 'H', 'W',
])

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Generate the phoneme display line for a card based on the drill mode.
 *
 * Produce (Tier 1):  "Buh · Ball"     — isolate first phoneme, then word
 * Guided (Tier 2):   "Kuh... Cat!"    — emphasize the emerging/hardest sound
 * Expose (Tier 3):   "Bllllue"        — stretch the hard sound within the word
 */
export function generatePhonemeDisplay(
  word: Word,
  drillMode: DrillMode,
): string {
  const w = capitalize(word.word)

  switch (drillMode) {
    case 'produce': {
      // Isolate first phoneme, then whole word: "Buh · Ball"
      const firstConsonant = word.consonant_ids[0]
      if (!firstConsonant) return w // pure vowel words
      const label = PHONEME_LABELS[firstConsonant] ?? ''
      return label ? `${label} · ${w}` : w
    }

    case 'guided': {
      // Emphasize the hardest (emerging) sound: "Kuh... Cat!"
      const hardest = word.hardest_sound_id
      if (hardest === '—') return `${w}!`
      const hardLabel = PHONEME_LABELS[hardest] ?? ''
      return hardLabel ? `${hardLabel}... ${w}!` : `${w}!`
    }

    case 'expose': {
      // Stretch the hard sound within the word: "Bllllue", "Ssssnake"
      return generateStretchedWord(word.word, word.hardest_sound_id)
    }
  }
}

/**
 * Stretch a target sound within a word for auditory bombardment (Tier 3 / expose mode).
 *
 * Continuant sounds (fricatives, liquids, nasals) can be physically held,
 * so we repeat the character to show stretching: "Bllllue", "Ssssnake".
 *
 * Stops and affricates can't be stretched — the air releases in a burst.
 * For these, we just emphasize with an exclamation: "Truck!".
 *
 * Linguistic edge cases handled:
 * - Multi-character sound IDs (SH, TH, CH): we stretch the full digraph → "Shhhoe"
 * - Sound appears in a cluster: we find the sound's character(s) in the word
 *   and stretch at that position → "Fffrog" (FR cluster, F is the hard sound)
 * - Sound appears multiple times: we stretch the first occurrence only
 */
function generateStretchedWord(word: string, hardestSoundId: string): string {
  const w = capitalize(word)

  // No consonant to stretch
  if (hardestSoundId === '—') return w

  // Stops and affricates can't be sustained — just emphasize
  if (!CONTINUANTS.has(hardestSoundId)) {
    return `${w}!`
  }

  // Map sound_id to the character(s) we'll look for in the word string.
  // This handles digraphs (SH, TH, CH) and single characters.
  const soundToChars: Record<string, string> = {
    S: 's', Z: 'z', F: 'f', V: 'v',
    SH: 'sh', TH_VOICELESS: 'th', TH_VOICED: 'th',
    L: 'l', R: 'r', M: 'm', N: 'n',
    NG: 'ng', H: 'h', W: 'w',
  }

  const targetChars = soundToChars[hardestSoundId]
  if (!targetChars) return `${w}!`

  // Find the target in the word (case-insensitive)
  const lowerWord = w.toLowerCase()
  const idx = lowerWord.indexOf(targetChars)

  if (idx === -1) return `${w}!`

  // Stretch by repeating the last character of the target 3 extra times.
  // "blue" + L at idx 1 → "Bllllue"
  // "shoe" + SH at idx 0 → "Shhhoe"
  const charToRepeat = targetChars.charAt(targetChars.length - 1)
  const repeated = charToRepeat.repeat(3)

  const before = w.slice(0, idx + targetChars.length)
  const after = w.slice(idx + targetChars.length)

  return before + repeated + after
}
