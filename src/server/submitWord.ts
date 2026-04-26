import { createServerFn } from '@tanstack/react-start'
import { getRequestIP } from '@tanstack/react-start-server'
import { words } from '~/data/words'

const REPO = 'johnjensenish/phoneme-word-trainer'
const LABEL = 'word-suggestion'
const WORD_RE = /^[a-z][a-z' -]{0,28}[a-z]$|^[a-z]$/
const SENTENCE_MAX = 200
const HONEYPOT_FIELD = 'website'

export type SubmitInput = {
  word: string
  sentence?: string
  captchaA: number
  captchaB: number
  captchaAnswer: number
  // Honeypot — bots fill it, humans don't see it. Real submissions leave it ''.
  [HONEYPOT_FIELD]?: string
}

export type SubmitResult =
  | { ok: true; issueNumber: number; status: 'queued' | 'duplicate-pending' }
  | { ok: false; error: string }

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
): Promise<number> {
  const body = [
    `**Word:** ${word}`,
    sentence ? `**Example sentence:** ${sentence}` : null,
    '',
    '_Submitted via the in-app suggestion form. The nightly classifier will pick this up._',
  ]
    .filter(Boolean)
    .join('\n')

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
      labels: [LABEL],
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

    if (words.some(w => w.word === data.word)) {
      return { ok: false, error: `"${data.word}" is already in the trainer.` }
    }

    try {
      const existing = await findExistingIssue(token, data.word)
      if (existing) {
        return { ok: true, issueNumber: existing, status: 'duplicate-pending' }
      }
      const issueNumber = await createIssue(token, data.word, data.sentence)
      return { ok: true, issueNumber, status: 'queued' }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      return { ok: false, error: msg }
    }
  })
