# Phoneme Word Trainer

**[phoneme.johnjensen.workers.dev](https://phoneme.johnjensen.workers.dev)**

A parent-led flashcard app for toddler speech development. Cards present age-appropriate words grouped by target phoneme, with emoji visuals and audio pronunciation. Based on Crowe & McLeod (2020) speech sound acquisition research from the *American Journal of Speech-Language Pathology*.

## Tech Stack

- **[React 19](https://react.dev/)** — UI framework
- **[TanStack Start](https://tanstack.com/start)** — Full-stack React framework with file-based routing and SSR
- **[TanStack Router](https://tanstack.com/router)** — Type-safe routing
- **[Vite 7](https://vite.dev/)** — Dev server and bundler
- **[TypeScript](https://www.typescriptlang.org/)** — Type safety
- **[Cloudflare Workers](https://developers.cloudflare.com/workers/)** — Edge deployment via `@cloudflare/vite-plugin`
- **[Google Cloud Text-to-Speech](https://cloud.google.com/text-to-speech)** — Pre-generated MP3 audio with SSML phoneme tags (Studio-O voice)
- **[Bun](https://bun.sh/)** — Package manager and script runner

## Getting Started

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Audio Generation

Audio files are pre-generated and committed to the repo (~5-10 KB each), so most developers won't need to run this unless sounds or words change.

### Prerequisites

- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (`brew install google-cloud-sdk`)
- A GCP project with the **Cloud Text-to-Speech API** enabled

### One-time setup

1. Log in to Google Cloud:

   ```sh
   gcloud auth application-default login
   ```

2. Set your GCP project as the quota project (replace `YOUR_PROJECT_ID`):

   ```sh
   gcloud auth application-default set-quota-project YOUR_PROJECT_ID
   ```

3. If you haven't already, enable the Text-to-Speech API:

   ```sh
   gcloud services enable texttospeech.googleapis.com --project=YOUR_PROJECT_ID
   ```

### Generate audio

```sh
bun run generate-audio
```

This creates MP3 files in `public/audio/phonemes/` and `public/audio/words/`. Existing files are skipped. To regenerate all files from scratch:

```sh
bun run generate-audio:force
```

## Deployment

```bash
bunx wrangler login   # one-time auth
bun run deploy
```

## Scripts

All scripts are in `scripts/` and run with `bun run scripts/<name>.ts`.

### Word Management

| Script | Description |
|--------|-------------|
| `scripts/add-word.ts` | Add a word with espeak-ng verified IPA. Auto-generates consonant analysis, clusters, word shape. Adds to both `words.ts` and `emojiMap.ts`. |
| `scripts/detect-ipa-changes.ts` | Compare all word IPA against espeak-ng American English dictionary. Flags British pronunciations and consonant mismatches. Target dialect: **PNW American English**. |
| `scripts/validate-words.ts` | Validate word metadata (syllable counts, consonant IDs, clusters, hardest sound) against computed values from IPA. Use `--summary` for counts only, `--field <name>` to check one field. |

```bash
# Add a word (preview first with --dry-run)
bun run scripts/add-word.ts "spatula" --category house --emoji 🍳 --dry-run
bun run scripts/add-word.ts "spatula" --category house --emoji 🍳

# Check all IPA against dictionary
bun run scripts/detect-ipa-changes.ts             # all differences
bun run scripts/detect-ipa-changes.ts --major      # consonant diffs only
bun run scripts/detect-ipa-changes.ts --delete     # delete audio for mismatches
```

### Audio Generation

Requires Google Cloud TTS credentials (see [Audio Generation](#audio-generation) above).

| Script | Description |
|--------|-------------|
| `scripts/generate-audio.ts` | Generate MP3 audio for all phonemes and words using Google Cloud TTS with SSML phoneme tags. Skips existing files. Use `--force` to regenerate all. |
| `scripts/generate-samples.ts` | Generate all 23 phoneme audio samples (consonant + vowel syllables). |
| `scripts/generate-samples-syllable.ts` | Test syllable-based phoneme synthesis approaches. |
| `scripts/generate-samples-phoneme-debug.ts` | Debug script for testing SSML approaches for specific phonemes. |

```bash
bun run generate-audio          # generate missing audio
bun run generate-audio:force    # regenerate all audio
```

### Data Files

| File | Description |
|------|-------------|
| `src/data/words.ts` | All words with IPA, consonant analysis, categories, and metadata. |
| `src/data/emojiMap.ts` | Maps `visual_hint` strings to emoji characters for flashcards. |
| `src/data/sounds.ts` | 45+ phoneme/sound definitions with age-based acquisition timelines. |
| `src/data/rhymes.ts` | Rhyme group definitions. |
| `src/data/types.ts` | TypeScript interfaces for Word, Sound, RhymeGroup, etc. |
| `src/engine/cardOrdering.ts` | Card filtering, ordering, and category definitions. |
| `src/hooks/useCards.ts` | Main hook for computing word cards with tiers and drill modes. |

### Word ID Prefixes

Words use category-based ID prefixes:

| Prefix | Category | Prefix | Category |
|--------|----------|--------|----------|
| `ACT` | actions | `NAT` | nature |
| `ANI` | animals | `NUM` | numbers |
| `BOD` | body | `PPL` | people |
| `CLO` | clothing | `SHP` | shapes |
| `COL` | colors | `SPA` | spatial |
| `DES` | describing | `TIM` | time |
| `FEE` | feelings | `TOY` | toys |
| `FOO` | food | `VEH` | vehicles |
| `FUR` | furniture | `WEA` | weather |
| `OBJ` | house | | |

## References

- [Interactive Phonemic Chart](https://www.englishclub.com/pronunciation/phonemic-chart-ia.php) — listen to all English phonemes
- Crowe, K., & McLeod, S. (2020). Children's consonant acquisition in 27 languages. *American Journal of Speech-Language Pathology*, 29(4).
