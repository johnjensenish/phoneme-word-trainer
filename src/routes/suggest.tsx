import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { submitWord, type SubmitResult } from '~/server/submitWord'

interface SuggestSearch {
  word?: string
}

export const Route = createFileRoute('/suggest')({
  component: SuggestPage,
  validateSearch: (search: Record<string, unknown>): SuggestSearch => ({
    word: typeof search.word === 'string' ? search.word.slice(0, 30) : undefined,
  }),
})

function rollChallenge() {
  return { a: 1 + Math.floor(Math.random() * 9), b: 1 + Math.floor(Math.random() * 9) }
}

function SuggestPage() {
  const { word: prefill } = Route.useSearch()
  const submit = useServerFn(submitWord)
  const [word, setWord] = useState(prefill ?? '')
  const [sentence, setSentence] = useState('')
  const [challenge, setChallenge] = useState(rollChallenge)
  const [answer, setAnswer] = useState('')
  const [trap, setTrap] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)

  const reroll = useCallback(() => {
    setChallenge(rollChallenge())
    setAnswer('')
  }, [])

  const send = useCallback(async (override?: { confirmDistinct: true; matchedWord: string }) => {
    setBusy(true)
    setResult(null)
    try {
      const res = await submit({
        data: {
          word,
          sentence: sentence || undefined,
          captchaA: challenge.a,
          captchaB: challenge.b,
          captchaAnswer: Number(answer),
          website: trap,
          ...(override ?? {}),
        },
      })
      setResult(res)
      if (res.ok) {
        setWord('')
        setSentence('')
      }
      reroll()
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'Submission failed' })
      reroll()
    } finally {
      setBusy(false)
    }
  }, [submit, word, sentence, challenge, answer, trap, reroll])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    void send()
  }

  return (
    <main style={{
      maxWidth: 560,
      margin: '0 auto',
      padding: 'var(--space-xl) var(--space-md)',
      minHeight: '100dvh',
    }}>
      <Link to="/app" style={{ fontSize: 13, fontWeight: 700 }}>← Back to the app</Link>

      <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 'var(--space-md)' }}>
        Suggest a word
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: 8, lineHeight: 1.5 }}>
        Missing a word your toddler loves? Send it in. We&rsquo;ll classify it,
        generate audio, and roll it into the next release.
      </p>

      <form onSubmit={onSubmit} style={{ marginTop: 'var(--space-lg)', display: 'grid', gap: 16 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Word</span>
          <input
            type="text"
            required
            autoComplete="off"
            autoCapitalize="none"
            spellCheck
            value={word}
            onChange={e => setWord(e.target.value)}
            placeholder="e.g. butter"
            maxLength={30}
            disabled={busy}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--color-border, #ddd)',
              background: 'var(--color-surface, #fff)',
              fontSize: 16,
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            Example sentence <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span>
          </span>
          <input
            type="text"
            value={sentence}
            onChange={e => setSentence(e.target.value)}
            placeholder='e.g. "I want more butter."'
            maxLength={200}
            disabled={busy}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--color-border, #ddd)',
              background: 'var(--color-surface, #fff)',
              fontSize: 16,
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Helps disambiguate homonyms (e.g. <em>fly</em> the bug vs. <em>fly</em> a kite).
          </span>
        </label>

        {/* Honeypot: visually hidden, off-screen, not focusable.
            Real humans never fill this; bots usually do. */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
          <label>
            Website
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={trap}
              onChange={e => setTrap(e.target.value)}
            />
          </label>
        </div>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>
            Quick check: what is {challenge.a} + {challenge.b}?
          </span>
          <input
            type="number"
            inputMode="numeric"
            required
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            min={2}
            max={18}
            disabled={busy}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--color-border, #ddd)',
              background: 'var(--color-surface, #fff)',
              fontSize: 16,
              maxWidth: 120,
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Confirms you&rsquo;re a human. We don&rsquo;t store this.
          </span>
        </label>

        <button
          type="submit"
          disabled={busy || !word.trim() || !answer}
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            background: 'var(--color-accent)',
            color: 'white',
            fontWeight: 800,
            fontSize: 15,
            opacity: busy || !word.trim() || !answer ? 0.6 : 1,
          }}
        >
          {busy ? 'Submitting…' : 'Submit suggestion'}
        </button>
      </form>

      {result?.ok && (
        <div role="status" aria-live="polite" style={resultBox('ok')}>
          {result.status === 'duplicate-pending'
            ? `Someone already suggested that one — tracked as #${result.issueNumber}.`
            : result.status === 'flagged'
              ? `Thanks! Flagged for human review as #${result.issueNumber}.`
              : `Thanks! Queued as #${result.issueNumber}. It'll appear in the app after the next batch lands.`}
        </div>
      )}

      {result && !result.ok && result.kind === 'lexical-match' && (
        <div role="status" aria-live="polite" style={resultBox('warn')}>
          <div>
            Looks like we already have <strong>{result.existingWord}</strong> — that
            matches your <strong>{word.trim()}</strong>.
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => send({ confirmDistinct: true, matchedWord: result.existingWord })}
              disabled={busy}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                background: 'var(--color-accent)',
                color: 'white',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {busy ? 'Submitting…' : 'This is a different word →'}
            </button>
            <button
              type="button"
              onClick={() => setResult(null)}
              disabled={busy}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                background: 'transparent',
                color: 'var(--color-text-muted)',
                fontWeight: 700,
                fontSize: 13,
                border: '1px solid var(--color-border, #ddd)',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && !result.ok && result.kind !== 'lexical-match' && (
        <div role="status" aria-live="polite" style={resultBox('err')}>
          {result.error}
        </div>
      )}
    </main>
  )
}

function resultBox(kind: 'ok' | 'warn' | 'err'): React.CSSProperties {
  const palette = {
    ok:   { bg: '#e8f5ee', fg: '#1f5132' },
    warn: { bg: '#fff4d6', fg: '#5c4400' },
    err:  { bg: '#fdecea', fg: '#7a1a14' },
  }[kind]
  return {
    marginTop: 20,
    padding: 14,
    borderRadius: 10,
    background: palette.bg,
    color: palette.fg,
    fontSize: 14,
    lineHeight: 1.5,
  }
}
