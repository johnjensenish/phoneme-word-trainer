import { createServerFn } from '@tanstack/react-start'
import { getRequestIP } from '@tanstack/react-start/server'
import { words } from '~/data/words'
import { findLexicalMatch } from './lexicalDedup'

const REPO = 'johnjensenish/phoneme-word-trainer'
const LABEL = 'word-suggestion'
const LABEL_REVIEW = 'needs-human-review'
const WORD_RE = /^[a-z][a-z' -]{0,28}[a-z]$|^[a-z]$/
const SENTENCE_MAX = 200
const HONEYPOT_FIELD = 'website'

export type SubmitInput = {
  word: string
  sentence?: string
  captchaA: number
  captchaB: number
  captchaAnswer: number
  // True when the user was shown a lexical match and clicked
  // "this is a different word." Files the issue with `needs-human-review`
  // (and the matched word in the body) so a maintainer adjudicates.
  confirmDistinct?: boolean
  matchedWord?: string
  // Honeypot — bots fill it, humans don't see it. Real submissions leave it ''.
  [HONEYPOT_FIELD]?: string
}

export type SubmitResult =
  | { ok: true; issueNumber: number; status: 'queued' | 'duplicate-pending' | 'flagged' }
  | { ok: false; kind: 'lexical-match'; existingWord: string; error: string }
  | { ok: false; kind?: undefined; error: string }

const recentByIp = new Map<string, number[]>()
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60 * 60 * 1000

function checkRate(ip: string): boolean {
  const now = Date.now()
  const window = (recentByIp.get(ip) ?? []).filter(t => now - t < RATE_WINDOW_MS)
  if (window.length >= RATE_LIMIT) {
    recentByIp.set(ip, window)
    return false
  }
  window.push(now)
  recentByIp.set(ip, window)
  return true
}

function validate(input: unknown): SubmitInput {
  if (!input || typeof input !== 'object') throw new Error('Invalid payload')
  const o = input as Record<string, unknown>
  const word = typeof o.word === 'string' ? o.word.trim().toLowerCase() : ''
  const sentence = typeof o.sentence === 'string' ? o.sentence.trim() : undefined
  const captchaA = Number(o.captchaA)
  const captchaB = Number(o.captchaB)
  const captchaAnswer = Number(o.captchaAnswer)
  const confirmDistinct = o.confirmDistinct === true
  const matchedWordRaw = typeof o.matchedWord === 'string' ? o.matchedWord.trim().toLowerCase() : ''
  const matchedWord = WORD_RE.test(matchedWordRaw) ? matchedWordRaw : undefined
  const honeypot = typeof o[HONEYPOT_FIELD] === 'string' ? (o[HONEYPOT_FIELD] as string) : ''

  if (!WORD_RE.test(word)) {
    throw new Error('Word must be 1–30 lowercase letters (apostrophes/hyphens/spaces allowed in the middle)')
  }
  if (sentence && sentence.length > SENTENCE_MAX) {
    throw new Error(`Example sentence must be under ${SENTENCE_MAX} characters`)
  }
  if (
    !Number.isInteger(captchaA) || captchaA < 1 || captchaA > 9 ||
    !Number.isInteger(captchaB) || captchaB < 1 || captchaB > 9 ||
    !Number.isInteger(captchaAnswer)
  ) {
    throw new Error('Invalid captcha challenge')
  }
  return {
    word,
    sentence: sentence || undefined,
    captchaA,
    captchaB,
    captchaAnswer,
    confirmDistinct,
    matchedWord,
    [HONEYPOT_FIELD]: honeypot,
  }
}

async function findExistingIssue(token: string, word: string): Promise<number | null> {
  const q = encodeURIComponent(`repo:${REPO} is:issue is:open label:${LABEL} in:title "word: ${word}"`)
  const res = await fetch(`https://api.github.com/search/issues?q=${q}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'phoneme-word-trainer',
    },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { items?: Array<{ number: number; title: string }> }
  const exact = data.items?.find(it => it.title.toLowerCase() === `word: ${word}`)
  return exact?.number ?? null
}

async function createIssue(
  token: string,
  word: string,
  sentence: string | undefined,
  opts: { matchedWord?: string } = {},
): Promise<number> {
  const flagged = Boolean(opts.matchedWord)
  const body = [
    `**Word:** ${word}`,
    sentence ? `**Example sentence:** ${sentence}` : null,
    flagged
      ? `**User confirmed distinct from existing word:** \`${opts.matchedWord}\``
      : null,
    '',
    flagged
      ? '_Submitted via the in-app suggestion form. The lexical dedup matched an existing word, but the submitter said it is a different word — please review manually._'
      : '_Submitted via the in-app suggestion form. The nightly classifier will pick this up._',
  ]
    .filter(Boolean)
    .join('\n')

  const labels = flagged ? [LABEL, LABEL_REVIEW] : [LABEL]
  const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'phoneme-word-trainer',
    },
    body: JSON.stringify({
      title: `word: ${word}`,
      body,
      labels,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = (await res.json()) as { number: number }
  return data.number
}

export const submitWord = createServerFn({ method: 'POST' })
  .inputValidator(validate)
  .handler(async ({ data }): Promise<SubmitResult> => {
    const token = process.env.GITHUB_PAT
    if (!token) return { ok: false, error: 'Server not configured (GITHUB_PAT missing)' }

    // Honeypot: bots fill hidden fields, humans don't. Pretend success
    // so the bot doesn't learn it was caught.
    if (data[HONEYPOT_FIELD] && data[HONEYPOT_FIELD].length > 0) {
      return { ok: true, issueNumber: 0, status: 'queued' }
    }

    if (data.captchaAnswer !== data.captchaA + data.captchaB) {
      return { ok: false, error: 'Math check failed. Try the new question.' }
    }

    let ip = 'unknown'
    try {
      ip = getRequestIP({ xForwardedFor: true }) ?? 'unknown'
    } catch {
      // Outside request scope (shouldn't happen in handler) — fall through.
    }
    if (!checkRate(ip)) {
      return { ok: false, error: 'Too many submissions from this IP. Try again later.' }
    }

    // Lexical dedup. Skip when the user has already confirmed it's distinct.
    if (!data.confirmDistinct) {
      const match = findLexicalMatch(data.word, words)
      if (match) {
        return {
          ok: false,
          kind: 'lexical-match',
          existingWord: match.existing.word,
          error:
            match.reason === 'exact'
              ? `"${data.word}" is already in the trainer.`
              : `Looks like we already have "${match.existing.word}" — that matches your "${data.word}".`,
        }
      }
    }

    try {
      const existing = await findExistingIssue(token, data.word)
      if (existing) {
        return { ok: true, issueNumber: existing, status: 'duplicate-pending' }
      }
      const flagged = data.confirmDistinct === true
      const issueNumber = await createIssue(token, data.word, data.sentence, {
        matchedWord: flagged ? data.matchedWord : undefined,
      })
      return {
        ok: true,
        issueNumber,
        status: flagged ? 'flagged' : 'queued',
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      return { ok: false, error: msg }
    }
  })
