# Word suggestions: end-to-end pipeline

Users submit new words from the app at `/suggest`. The submission gets queued
as a GitHub issue, a nightly cron classifies and adds it via `add-word.ts`, a
single rolling PR collects the batch, and merging the PR ships the words.

## Flow

```
User → /suggest form → Worker server fn → GitHub issue (label: word-suggestion)
                                            │
                                            ▼
                              ┌─ daily cron (word-suggestions-cron.yml)
                              │   1. fetch open `word-suggestion` issues
                              │      that don't have `queued`
                              │   2. classify each via GitHub Models
                              │      (category + emoji + confidence)
                              │   3. low-confidence → label `needs-human-review`
                              │   4. accepted → run add-word.ts, commit
                              │   5. push to `bot/word-suggestions`
                              │      (reuse open PR if one exists, else open)
                              │   6. label issues `queued` + comment
                              └─
                                            │
                                  Maintainer reviews & merges PR
                                            │
                                            ▼
                              GitHub auto-closes referenced issues
                                            │
                       generate-audio.yml synthesizes any missing MP3s
```

If the PR is **closed without merging**, `word-suggestions-requeue.yml`
strips the `queued` label from referenced issues so the next cron pick them up
again.

## One-time setup (must be done at github.com)

### 0. Install the workflow files

The two workflow YAMLs live at `docs/workflows/` rather than
`.github/workflows/` because the OAuth app that opens this branch lacks the
`workflow` scope and can't push them. Move them into place once with a
human-authored commit:

```sh
mkdir -p .github/workflows
git mv docs/workflows/word-suggestions-cron.yml .github/workflows/
git mv docs/workflows/word-suggestions-requeue.yml .github/workflows/
git commit -m "Activate word-suggestions workflows"
git push
```


### 1. Create the labels

In `johnjensenish/phoneme-word-trainer` → Issues → Labels:

| name                  | color    | description                                          |
| --------------------- | -------- | ---------------------------------------------------- |
| `word-suggestion`     | `0e8a16` | New word submitted via the in-app form               |
| `queued`              | `fbca04` | Already included in an open `bot/word-suggestions` PR |
| `needs-human-review`  | `d93f0b` | Auto-classifier wasn't confident enough              |

### 2. Mint a fine-grained PAT for the Worker

The Cloudflare Worker (server function) needs to file issues. Create a
fine-grained PAT scoped to **only this repo** with these permissions:

- **Repository access**: `Only select repositories` → `phoneme-word-trainer`
- **Repository permissions**:
  - Issues: **Read and write**
  - Metadata: **Read-only** (auto-included)

Set the expiration to whatever you're comfortable with (1 year max). Set a
calendar reminder to rotate it before it expires.

### 3. Wire the PAT into Cloudflare

```sh
# Production (deployed Worker)
bunx wrangler secret put GITHUB_PAT

# Local dev: create .dev.vars (gitignored)
echo 'GITHUB_PAT="ghp_..."' >> .dev.vars
```

`.dev.vars` is read automatically by `vite dev` via the Cloudflare plugin and
must NOT be committed.

### 4. Allow GitHub Actions to use Models

Repo Settings → Actions → General → ensure **Read and write permissions** for
the `GITHUB_TOKEN` are enabled. Models inference uses this token and the
workflow already requests `permissions: models: read`.

### 5. Auto-delete merged branches (optional but recommended)

Repo Settings → General → tick **"Automatically delete head branches"**. This
keeps `bot/word-suggestions` clean between batches.

## Operating notes

- **Branch naming is load-bearing.** The cron and the requeue workflow both key
  off the prefix `bot/word-suggestions`. Don't rename it without updating both.
- **One PR at a time.** A single rolling PR collects the batch. Merge it before
  significant churn lands on `main`, otherwise the next cron run will rebase
  the bot branch and force-push.
- **Rate limit.** The Worker rate-limits submissions per IP at 5/hour
  (in-memory; resets when the Worker cold-starts). Tighten or move to a KV
  binding if abuse becomes an issue.
- **Model choice.** Defaults to `openai/gpt-4o-mini` via GitHub Models. Override
  by setting `WORD_CLASSIFIER_MODEL` in the cron workflow env.
- **Cost.** GitHub Models has a free per-account quota that's plenty for a
  daily batch of a few words. The Worker's GitHub API calls are ~2 requests
  per submission.

## Testing locally

```sh
# Dry-run the classifier with a mock input:
echo '[{"number": 1, "word": "butter"}]' \
  | GITHUB_TOKEN=ghp_xxx bun run scripts/classify-suggestions.ts

# Manually trigger the cron from the GitHub UI:
# Actions → Process Word Suggestions → Run workflow
```
