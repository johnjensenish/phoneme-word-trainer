# Audio Generation

Pre-generates MP3 files for all phonemes and words using Google Cloud Text-to-Speech.

## Prerequisites

- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) (`brew install google-cloud-sdk`)
- A GCP project with the **Cloud Text-to-Speech API** enabled

## One-time setup

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

## Generate audio

```sh
bun run generate-audio
```

This creates MP3 files in `public/audio/phonemes/` and `public/audio/words/`. Existing files are skipped.

To regenerate all files from scratch:

```sh
bun run generate-audio:force
```

## Notes

- Audio files are committed to the repo, so most developers won't need to run this unless sounds or words change.
- Voice: `en-US-Neural2-C` (female, child-friendly).
- The generated files are ~5-10 KB each, ~1.5 MB total.
