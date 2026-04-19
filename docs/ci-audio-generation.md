# Plan: Auto-generate and commit audio files in CI

## Goal

When `src/data/words.ts` gains new entries, CI should synthesize the missing
MP3s via Google Cloud TTS and commit them to the PR branch — no local run
required.

## Why

`scripts/generate-audio.ts` already uses Google Cloud TTS with `en-US-Studio-O`
and skips files that already exist. Today it only runs locally, so new words
sit without audio until someone runs it manually with ADC credentials. Moving
it into CI closes the loop: add word → push → audio appears.

## User actions required (must be done at a computer)

These steps touch GCP + GitHub secrets, which Claude can't do remotely:

1. **Create or identify a GCP project** with billing enabled and the
   **Cloud Text-to-Speech API** enabled.

   ```sh
   gcloud services enable texttospeech.googleapis.com
   ```

2. **Create a service account** with minimal TTS permissions:

   ```sh
   gcloud iam service-accounts create pwt-tts-ci \
     --display-name "Phoneme Trainer TTS CI"

   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member serviceAccount:pwt-tts-ci@$PROJECT_ID.iam.gserviceaccount.com \
     --role roles/cloudtexttospeech.user
   ```

3. **Generate and download a JSON key**:

   ```sh
   gcloud iam service-accounts keys create key.json \
     --iam-account pwt-tts-ci@$PROJECT_ID.iam.gserviceaccount.com
   ```

4. **Add repo secrets** in GitHub → Settings → Secrets and variables → Actions:
   - `GCP_TTS_SA_KEY` — paste the full contents of `key.json`
   - `GCP_PROJECT_ID` — the project ID (optional; only if the script needs it
     explicitly)

5. **Confirm the workflow permissions** at Settings → Actions → General:
   - Workflow permissions: **Read and write** (so the job can push commits back)
   - Allow GitHub Actions to create and approve pull requests: leave default

Once those are in place, Claude can land the workflow changes below.

## Implementation plan (Claude can do this)

### 1. New workflow: `.github/workflows/generate-audio.yml`

Triggered on PR opens/pushes that modify `src/data/words.ts`:

```yaml
name: Generate Audio
on:
  pull_request:
    paths:
      - 'src/data/words.ts'
      - 'scripts/generate-audio.ts'

jobs:
  generate-audio:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.head_ref }}
          token: ${{ secrets.GITHUB_TOKEN }}
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - name: Write GCP credentials
        env:
          GCP_TTS_SA_KEY: ${{ secrets.GCP_TTS_SA_KEY }}
        run: |
          echo "$GCP_TTS_SA_KEY" > "$RUNNER_TEMP/gcp-key.json"
          echo "GOOGLE_APPLICATION_CREDENTIALS=$RUNNER_TEMP/gcp-key.json" >> $GITHUB_ENV
      - name: Generate missing audio
        run: bun run scripts/generate-audio.ts
      - name: Commit new audio
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add public/audio
          if ! git diff --cached --quiet; then
            git commit -m "Generate audio for new words"
            git push
          else
            echo "No new audio files to commit."
          fi
```

### 2. Verify `generate-audio.ts` is CI-safe

- Already skips existing files (no `--force`) — good.
- Uses `TextToSpeechClient()` which reads `GOOGLE_APPLICATION_CREDENTIALS` — good.
- Runs sequentially in batches of 5 — fine for CI.
- No interactive prompts — good.

No changes expected, but worth a test run.

### 3. Test plan

- [ ] Open a throwaway PR that adds a single word via `scripts/add-word.ts`
- [ ] Confirm the `Generate Audio` job runs, produces 1 new MP3 in
      `public/audio/words/`, and pushes a follow-up commit to the PR branch
- [ ] Confirm subsequent pushes don't regenerate existing files (skip logic)
- [ ] Confirm the main CI workflow (`ci.yml`) still passes on the enriched commit

### 4. Documentation

- Append a short "CI audio generation" note to `README.md` describing the
  trigger and the required secrets, so future contributors know the key
  rotates via `GCP_TTS_SA_KEY`.

## Cost / quota notes

- Studio voices are **\$0.16 per 1K characters** (as of last check). A typical
  word MP3 is ~20 chars of SSML — roughly \$0.003 per word. Adding 10 words
  per PR ≈ \$0.03.
- Skip-if-exists logic means re-runs are free.

## Out of scope

- Regenerating existing audio when the script's SSML templates change (would
  need `--force` on a manual `workflow_dispatch` trigger — can be a follow-up).
- Audio for phonemes (the script handles these, but they rarely change;
  consider a separate manual trigger).

## Checklist for closing

- [ ] GCP project + service account + key created (user)
- [ ] `GCP_TTS_SA_KEY` secret added to repo (user)
- [ ] Workflow permissions set to read/write (user)
- [ ] `.github/workflows/generate-audio.yml` landed (Claude)
- [ ] README updated (Claude)
- [ ] Test PR confirms end-to-end flow
