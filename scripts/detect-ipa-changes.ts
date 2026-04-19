/**
 * Detect IPA differences between words.ts and American English dictionary (espeak-ng).
 *
 * TARGET DIALECT: Pacific Northwest (PNW) American English
 *
 * This app teaches speech to young American children. All IPA must reflect
 * actual PNW American pronunciation — never British English. Key PNW features:
 *
 *   - Cot-caught merger: /ɒ/ does NOT exist. Use /ɑː/ for "hot", "dog", "pot".
 *     British /ɒ/ sounds foreign to PNW kids and will confuse TTS output.
 *   - Rhotic: All r's are pronounced. Use /ɝː/ or /ɚ/ for "bird", "butter".
 *     Never use non-rhotic British forms like /bɜːd/.
 *   - Flap t: Intervocalic /t/ becomes [ɾ] ("water" = [wɔːɾɚ]).
 *     Both /t/ and /ɾ/ are acceptable in transcription.
 *   - No /njuː/: "new" = /nuː/, not British /njuː/.
 *   - /æ/ before nasals: "branch" = /bræntʃ/, not British /brɑːntʃ/.
 *
 * Flags that should NEVER appear in words.ts:
 *   - ɒ (British rounded open-back) → use ɑː
 *   - njuː for "new/knew" words → use nuː
 *
 * Requires: espeak-ng (apt-get install -y espeak-ng)
 *
 * Usage:
 *   bun run scripts/detect-ipa-changes.ts             # report all differences
 *   bun run scripts/detect-ipa-changes.ts --major      # only show major (consonant) diffs
 *   bun run scripts/detect-ipa-changes.ts --delete     # delete audio for major mismatches
 */
import { execSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";
import { words } from "../src/data/words";

const AUDIO_DIR = join(import.meta.dir, "..", "public", "audio", "words");
const majorOnly = process.argv.includes("--major");
const shouldDelete = process.argv.includes("--delete");

// ── Pre-flight checks ───────────────────────────────────────────────

try {
  execSync("which espeak-ng", { encoding: "utf-8" });
} catch {
  console.error("ERROR: espeak-ng is not installed. Run: apt-get install -y espeak-ng");
  process.exit(1);
}

// ── British IPA detector ────────────────────────────────────────────
// Catch any British-isms that slipped in before we even compare to the dictionary.

const britishFlags: Array<{ word: string; ipa: string; reason: string }> = [];

for (const w of words) {
  if (w.ipa.includes("\u0252")) { // ɒ
    britishFlags.push({ word: w.word, ipa: w.ipa, reason: "Contains ɒ (British). Use ɑː for PNW American." });
  }
  if (w.ipa.includes("njuː") && ["new", "knew"].includes(w.word)) {
    britishFlags.push({ word: w.word, ipa: w.ipa, reason: "Uses njuː (British). Use nuː for PNW American." });
  }
}

if (britishFlags.length > 0) {
  console.log(`\n🚨 BRITISH PRONUNCIATIONS DETECTED (${britishFlags.length}) — must fix!\n`);
  for (const f of britishFlags) {
    console.log(`  ${f.word.padEnd(22)} ${f.ipa.padEnd(20)} ${f.reason}`);
  }
  console.log();
}

// ── Dictionary comparison ───────────────────────────────────────────

function getEspeakIPA(word: string): string {
  try {
    return execSync(`espeak-ng -v en-us --ipa -q "${word.replace(/"/g, '\\"')}"`, {
      encoding: "utf-8",
    }).trim();
  } catch {
    return "";
  }
}

/**
 * Normalize IPA for comparison.
 *
 * Maps dialect/style variants to a common form so we only flag real errors,
 * not transcription style differences (stress marking, syllable breaks,
 * vowel length notation, rhotic vowel symbols).
 */
function normalize(ipa: string): string {
  return ipa
    .replace(/[ˈˌ]/g, "")         // stress marks
    .replace(/[.\-·]/g, "")        // syllable separators
    .replace(/ː/g, "")            // length marks
    .replace(/\s+/g, "")          // spaces
    .replace(/ɹ/g, "r")           // r variants
    .replace(/ɾ/g, "t")           // flap t = /t/ (American allophone)
    .replace(/ɝ/g, "ɜ")           // rhotacized = non-rhotacized for comparison
    .replace(/ɚ/g, "ɜ")           // rhotacized schwa
    .replace(/ɜr/g, "ɜ")          // explicit ɜr = ɜ alone
    .replace(/ər/g, "ɜ")          // schwa+r = rhotacized vowel
    .replace(/ɐ/g, "ə")           // near-open central → schwa
    .replace(/ᵻ/g, "ɪ")           // barred i → ɪ
    .replace(/ʔ/g, "t")           // glottal stop (allophone of t)
    .replace(/n̩/g, "ən")          // syllabic n
    .replace(/l̩/g, "əl")          // syllabic l
    .replace(/ɒ/g, "ɑ")           // cot-caught merger (PNW)
    .replace(/ɔ/g, "ɑ")           // caught = cot in PNW
    .trim();
}

/** Extract consonant skeleton, ignoring vowels (for major mismatch detection) */
function consonantSkeleton(ipa: string): string {
  return normalize(ipa).replace(/[aɑæɒʌəɛeɪiɔoʊuʉɜ]/g, "");
}

interface Mismatch {
  word: string;
  configured: string;
  dictionary: string;
  severity: "MAJOR" | "MINOR";
}

const mismatches: Mismatch[] = [];
const matched: string[] = [];
const noResult: string[] = [];

console.log(`Checking ${words.length} words against espeak-ng (en-us)...\n`);

for (const w of words) {
  const dictIPA = getEspeakIPA(w.word);

  if (!dictIPA) {
    noResult.push(w.word);
    continue;
  }

  const normOurs = normalize(w.ipa);
  const normDict = normalize(dictIPA);

  if (normOurs === normDict) {
    matched.push(w.word);
    continue;
  }

  const skelOurs = consonantSkeleton(w.ipa);
  const skelDict = consonantSkeleton(dictIPA);
  const severity = skelOurs === skelDict ? "MINOR" : "MAJOR";

  mismatches.push({
    word: w.word,
    configured: w.ipa,
    dictionary: dictIPA,
    severity,
  });
}

// ── Report ──────────────────────────────────────────────────────────

const major = mismatches.filter(m => m.severity === "MAJOR");
const minor = mismatches.filter(m => m.severity === "MINOR");

console.log(`=== IPA Dictionary Comparison (PNW American English) ===\n`);
console.log(`Total words:      ${words.length}`);
console.log(`Matched:          ${matched.length}`);
console.log(`Mismatches:       ${mismatches.length}`);
console.log(`  MAJOR:          ${major.length} (consonant differences — likely errors)`);
console.log(`  MINOR:          ${minor.length} (vowel/stress — likely style differences)`);
console.log(`British flags:    ${britishFlags.length}`);
console.log(`No dict result:   ${noResult.length}`);

if (major.length > 0) {
  console.log(`\n--- MAJOR (consonant differences) ---`);
  for (const m of major) {
    console.log(`  ${m.word.padEnd(22)} CONFIG: ${m.configured.padEnd(20)} DICT: ${m.dictionary}`);
  }
}

if (!majorOnly && minor.length > 0) {
  console.log(`\n--- MINOR (vowel/stress differences) ---`);
  for (const m of minor) {
    console.log(`  ${m.word.padEnd(22)} CONFIG: ${m.configured.padEnd(20)} DICT: ${m.dictionary}`);
  }
}

if (noResult.length > 0) {
  console.log(`\n--- NO DICTIONARY RESULT ---`);
  console.log(`  ${noResult.join(", ")}`);
}

// ── Delete stale audio ──────────────────────────────────────────────

if (shouldDelete && major.length > 0) {
  let deleted = 0;
  for (const m of major) {
    const audioPath = join(AUDIO_DIR, `${m.word}.mp3`);
    if (existsSync(audioPath)) {
      unlinkSync(audioPath);
      console.log(`Deleted: ${audioPath}`);
      deleted++;
    }
  }
  if (deleted > 0) console.log(`\nDeleted ${deleted} audio files for major mismatches.`);
}

// ── Exit code ───────────────────────────────────────────────────────

const errors = major.length + britishFlags.length;
if (errors > 0) {
  console.log(`\n${errors} issue(s) need review.`);
  process.exit(1);
}
