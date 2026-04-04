/**
 * Detect words whose IPA has changed since their audio was last generated.
 *
 * Compares current IPA values in words.ts against a stored snapshot (.ipa-snapshot.json).
 * On first run, creates the snapshot. On subsequent runs, reports diffs and optionally
 * updates the snapshot.
 *
 * Usage:
 *   bun run scripts/detect-ipa-changes.ts           # report changes
 *   bun run scripts/detect-ipa-changes.ts --update   # report changes and update snapshot
 *   bun run scripts/detect-ipa-changes.ts --delete   # report, delete stale audio, update snapshot
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { words } from "../src/data/words";

const SNAPSHOT_PATH = join(import.meta.dir, "..", ".ipa-snapshot.json");
const AUDIO_DIR = join(import.meta.dir, "..", "public", "audio", "words");

const shouldUpdate = process.argv.includes("--update") || process.argv.includes("--delete");
const shouldDelete = process.argv.includes("--delete");

type Snapshot = Record<string, { word: string; ipa: string }>;

// Build current state
const current: Snapshot = {};
for (const w of words) {
  current[w.word_id] = { word: w.word, ipa: w.ipa };
}

// Load or create snapshot
if (!existsSync(SNAPSHOT_PATH)) {
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(current, null, 2));
  console.log(`Created initial snapshot with ${Object.keys(current).length} words.`);
  console.log(`Path: ${SNAPSHOT_PATH}`);
  process.exit(0);
}

const previous: Snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8"));

// Detect changes
const changed: Array<{ id: string; word: string; oldIpa: string; newIpa: string }> = [];
const added: Array<{ id: string; word: string; ipa: string }> = [];
const removed: Array<{ id: string; word: string }> = [];

for (const [id, entry] of Object.entries(current)) {
  if (!(id in previous)) {
    added.push({ id, word: entry.word, ipa: entry.ipa });
  } else if (previous[id].ipa !== entry.ipa) {
    changed.push({ id, word: entry.word, oldIpa: previous[id].ipa, newIpa: entry.ipa });
  }
}

for (const [id, entry] of Object.entries(previous)) {
  if (!(id in current)) {
    removed.push({ id, word: entry.word });
  }
}

// Report
console.log(`=== IPA Change Detection ===\n`);
console.log(`Snapshot: ${Object.keys(previous).length} words`);
console.log(`Current:  ${Object.keys(current).length} words\n`);

if (changed.length === 0 && added.length === 0 && removed.length === 0) {
  console.log("No changes detected.");
  process.exit(0);
}

if (changed.length > 0) {
  console.log(`--- IPA Changed (${changed.length}) - audio needs regeneration ---`);
  for (const c of changed) {
    console.log(`  ${c.id.padEnd(8)} ${c.word.padEnd(20)} ${c.oldIpa.padEnd(20)} → ${c.newIpa}`);
  }
  console.log();
}

if (added.length > 0) {
  console.log(`--- New Words (${added.length}) - audio needs generation ---`);
  for (const a of added) {
    console.log(`  ${a.id.padEnd(8)} ${a.word.padEnd(20)} ${a.ipa}`);
  }
  console.log();
}

if (removed.length > 0) {
  console.log(`--- Removed Words (${removed.length}) - audio can be deleted ---`);
  for (const r of removed) {
    console.log(`  ${r.id.padEnd(8)} ${r.word}`);
  }
  console.log();
}

// Delete stale audio files for changed words
if (shouldDelete) {
  let deleted = 0;
  for (const c of changed) {
    const audioPath = join(AUDIO_DIR, `${c.word}.mp3`);
    if (existsSync(audioPath)) {
      unlinkSync(audioPath);
      console.log(`Deleted: ${audioPath}`);
      deleted++;
    }
  }
  for (const r of removed) {
    const audioPath = join(AUDIO_DIR, `${r.word}.mp3`);
    if (existsSync(audioPath)) {
      unlinkSync(audioPath);
      console.log(`Deleted: ${audioPath}`);
      deleted++;
    }
  }
  if (deleted > 0) console.log(`\nDeleted ${deleted} audio files.`);
}

// Update snapshot
if (shouldUpdate) {
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(current, null, 2));
  console.log("Snapshot updated.");
} else {
  console.log("Run with --update to update the snapshot, or --delete to also remove stale audio.");
}
