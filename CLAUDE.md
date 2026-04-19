# CLAUDE.md

Super-brief ops guide. See [README.md](./README.md) for everything else.

## Adding words

Always use the script — it derives IPA via espeak-ng (PNW American English) and all the metadata (consonants, positions, clusters, word shape, syllable count, ID). Don't hand-edit `src/data/words.ts` when adding.

```sh
bun run scripts/add-word.ts "chip" --category food --emoji 🍟
```

- Preview first with `--dry-run`.
- Pick a `--category` from: actions, animals, body, clothing, colors, describing, feelings, food, furniture, house, nature, numbers, people, shapes, spatial, time, toys, vehicles, weather.
- Optionally `--type` (defaults based on category).
- Audio is generated automatically in CI when `src/data/words.ts` changes (see `.github/workflows/generate-audio.yml`).

## Type checking

`bun run build` — runs Vite build and `tsc --noEmit`. Don't use `npx tsc`.

## Search / edit

Prefer the Grep / Glob / Read / Edit tools over Bash `grep`/`cat`/`sed` — avoids approval prompts.
