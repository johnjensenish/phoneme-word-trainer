import type { Word } from '~/data/types'

// Irregular plurals + irregular verb forms common in toddler vocabulary.
// Maps any inflected form to its canonical base.
const IRREGULARS: Record<string, string> = {
  mice: 'mouse', mouses: 'mouse',
  feet: 'foot', foots: 'foot',
  teeth: 'tooth', tooths: 'tooth',
  geese: 'goose', gooses: 'goose',
  children: 'child', childs: 'child', kids: 'kid',
  people: 'person', persons: 'person',
  men: 'man', women: 'woman',
  knives: 'knife', leaves: 'leaf', wolves: 'wolf', loaves: 'loaf',
  shelves: 'shelf', halves: 'half', calves: 'calf',
  fish: 'fish', sheep: 'sheep', deer: 'deer', moose: 'moose',
  // Common irregular verbs a toddler might say.
  went: 'go', gone: 'go', goes: 'go', going: 'go',
  was: 'be', were: 'be', being: 'be', been: 'be',
  ate: 'eat', eaten: 'eat', eating: 'eat',
  ran: 'run', running: 'run',
  swam: 'swim', swum: 'swim', swimming: 'swim',
  sat: 'sit', sitting: 'sit',
  lay: 'lie', lain: 'lie', lying: 'lie',
  fell: 'fall', fallen: 'fall', falling: 'fall',
  saw: 'see', seen: 'see', seeing: 'see',
  said: 'say', saying: 'say',
  made: 'make', making: 'make',
  took: 'take', taken: 'take', taking: 'take',
  gave: 'give', given: 'give', giving: 'give',
  got: 'get', gotten: 'get', getting: 'get',
  had: 'have', having: 'have',
  brought: 'bring', bringing: 'bring',
  caught: 'catch', catching: 'catch',
  taught: 'teach', teaching: 'teach',
  bought: 'buy', buying: 'buy',
  thought: 'think', thinking: 'think',
}

function stem(word: string): string {
  const irregular = IRREGULARS[word]
  if (irregular) return irregular
  let s = word

  const apply = (re: RegExp, replace = ''): boolean => {
    if (!re.test(s)) return false
    const next = s.replace(re, replace)
    if (next.length < 3) return false
    s = next
    return true
  }

  // Most-specific morphology first; return after the first match so we
  // don't double-strip (e.g. "running" → "run", not "ru").
  if (apply(/(ies|ied)$/, 'y')) return s
  if (apply(/iest$/, 'y')) return s
  if (apply(/ier$/, 'y')) return s
  if (apply(/ying$/, 'ie')) return s
  if (apply(/ing$/)) {
    // Undo doubled-consonant: "runn" → "run", "stopp" → "stop".
    if (/([bdfgklmnprstvz])\1$/.test(s)) s = s.slice(0, -1)
    return s
  }
  if (apply(/edly$/)) return s
  if (apply(/ed$/)) {
    if (/([bdfgklmnprstvz])\1$/.test(s)) s = s.slice(0, -1)
    return s
  }
  // Only strip "es" when the residue ends in a sound that requires it
  // (boxes, dishes, foxes). Otherwise fall through to plain "s".
  if (/(xes|ses|zes|ches|shes|oes)$/.test(s) && s.length > 4) {
    return s.slice(0, -2)
  }
  // Plain plural — but keep -ss intact so "kiss" doesn't become "kis".
  if (!/ss$/.test(s) && apply(/s$/)) return s
  return s
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  // Single-row DP.
  let prev = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      )
    }
    prev = curr
  }
  return prev[b.length]
}

export interface LexicalMatch {
  existing: Word
  reason: 'exact' | 'stem' | 'edit-distance'
}

/**
 * Find an existing word that is lexically too close to the submitted one.
 * Returns null if the submission is clearly distinct.
 */
export function findLexicalMatch(submitted: string, words: Word[]): LexicalMatch | null {
  const s = submitted.trim().toLowerCase()
  if (!s) return null

  // 1. Exact match.
  const exact = words.find(w => w.word === s)
  if (exact) return { existing: exact, reason: 'exact' }

  const sStem = stem(s)

  // 2. Same stem (catches plurals, verb tenses, irregulars).
  for (const w of words) {
    if (stem(w.word) === sStem) return { existing: w, reason: 'stem' }
  }

  // 3. Edit distance ≤ 1 against words of length ≥ 5
  // (avoids flagging "cat" vs "bat" while still catching "bunni" vs "bunny").
  if (s.length >= 5) {
    for (const w of words) {
      if (w.word.length >= 5 && levenshtein(s, w.word) <= 1) {
        return { existing: w, reason: 'edit-distance' }
      }
    }
  }

  return null
}
