import { createServerFn } from '@tanstack/react-start'
import { getRequestIP } from '@tanstack/react-start-server'
import { words } from '~/data/words'

const REPO = 'johnjensenish/phoneme-word-trainer'
const LABEL = 'word-suggestion'
const WORD_RE = /^[a-z][a-z' -]{0,28}[a-z]$|^[a-z]$/
const SENTENCE_MAX = 200

export type SubmitInput = {
  word: string
  sentence?: string
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
  if (!WORD_RE.test(word)) {
    throw new Error('Word must be 1–30 lowercase letters (apostrophes/hyphens/spaces allowed in the middle)')
  }
  if (sentence && sentence.length > SENTENCE_MAX) {
    throw new Error(`Example sentence must be under ${SENTENCE_MAX} characters`)
  }
  return { word, sentence: sentence || undefined }
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
