# Phoneme Word Trainer

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

## References

- [Interactive Phonemic Chart](https://www.englishclub.com/pronunciation/phonemic-chart-ia.php) — listen to all English phonemes
- Crowe, K., & McLeod, S. (2020). Children's consonant acquisition in 27 languages. *American Journal of Speech-Language Pathology*, 29(4).
