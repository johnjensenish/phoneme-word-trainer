/**
 * IPA Verification Script
 * Cross-checks all word IPA transcriptions against espeak-ng (American English).
 *
 * Usage: bun run scripts/verify-ipa.ts
 * Requires: espeak-ng (apt-get install -y espeak-ng)
 */
import { words } from "../src/data/words";
import { execSync } from "child_process";

// Check espeak-ng is available
try {
  execSync("which espeak-ng", { encoding: "utf-8" });
} catch {
  console.error("ERROR: espeak-ng is not installed. Run: apt-get install -y espeak-ng");
  process.exit(1);
}

function getEspeakIPA(word: string): string {
  try {
    return execSync(`espeak-ng -v en-us --ipa -q "${word.replace(/"/g, '\\"')}"`, {
      encoding: "utf-8",
    }).trim();
  } catch {
    return "";
  }
}

// Normalize IPA for comparison
function normalize(ipa: string): string {
  return ipa
    .replace(/[ˈˌ]/g, "")         // stress marks
    .replace(/[.\-·]/g, "")        // syllable separators
    .replace(/ː/g, "")            // length marks
    .replace(/\s+/g, "")          // spaces
    .replace(/ɹ/g, "r")           // r variants
    .replace(/ɾ/g, "t")           // flap t (American English)
    .replace(/ɝ/g, "ɜ")            // rhotacized = non-rhotacized for comparison
    .replace(/ɚ/g, "ɜ")           // rhotacized schwa = ɜ for comparison
    .replace(/ɜr/g, "ɜ")          // explicit ɜr same as ɜ alone
    .replace(/ər/g, "ɜ")          // schwa+r same as ɜ
    .replace(/ɐ/g, "ə")           // near-open central
    .replace(/ᵻ/g, "ɪ")           // barred i
    .replace(/ʔ/g, "t")           // glottal stop (allophone of t)
    .replace(/n̩/g, "ən")          // syllabic n
    .replace(/l̩/g, "əl")          // syllabic l
    .trim();
}

// Extract consonant skeleton (ignoring vowels)
function consonantSkeleton(ipa: string): string {
  return normalize(ipa).replace(/[aɑæɒʌəɛeɪiɔoʊuʉ]/g, "");
}

interface Mismatch {
  word_id: string;
  word: string;
  ours: string;
  espeak: string;
  severity: "MAJOR" | "MINOR";
}

const mismatches: Mismatch[] = [];
const matched: string[] = [];
const noResult: string[] = [];

console.log(`Checking ${words.length} words against espeak-ng (en-us)...\n`);

for (const w of words) {
  const espeakIPA = getEspeakIPA(w.word);

  if (!espeakIPA) {
    noResult.push(w.word);
    continue;
  }

  const normOurs = normalize(w.ipa);
  const normEspeak = normalize(espeakIPA);

  if (normOurs === normEspeak) {
    matched.push(w.word);
    continue;
  }

  const skelOurs = consonantSkeleton(w.ipa);
  const skelEspeak = consonantSkeleton(espeakIPA);
  const severity = skelOurs === skelEspeak ? "MINOR" : "MAJOR";

  mismatches.push({
    word_id: w.word_id,
    word: w.word,
    ours: w.ipa,
    espeak: espeakIPA,
    severity,
  });
}

console.log(`=== IPA VERIFICATION RESULTS ===\n`);
console.log(`Total words:    ${words.length}`);
console.log(`Matched:        ${matched.length}`);
console.log(`Mismatches:     ${mismatches.length}`);
console.log(`  MAJOR:        ${mismatches.filter(m => m.severity === "MAJOR").length} (consonant differences)`);
console.log(`  MINOR:        ${mismatches.filter(m => m.severity === "MINOR").length} (vowel/stress only)`);
console.log(`No result:      ${noResult.length}`);

const major = mismatches.filter(m => m.severity === "MAJOR");
if (major.length > 0) {
  console.log(`\n--- MAJOR MISMATCHES (review these) ---`);
  for (const m of major) {
    console.log(`  ${m.word_id.padEnd(8)} ${m.word.padEnd(20)} OURS: ${m.ours.padEnd(20)} ESPEAK: ${m.espeak}`);
  }
}

const minor = mismatches.filter(m => m.severity === "MINOR");
if (minor.length > 0) {
  console.log(`\n--- MINOR MISMATCHES (likely dialect/style differences) ---`);
  for (const m of minor) {
    console.log(`  ${m.word_id.padEnd(8)} ${m.word.padEnd(20)} OURS: ${m.ours.padEnd(20)} ESPEAK: ${m.espeak}`);
  }
}

if (noResult.length > 0) {
  console.log(`\n--- NO ESPEAK RESULT ---`);
  console.log(`  ${noResult.join(", ")}`);
}

// Exit with error code if major mismatches found
if (major.length > 0) {
  console.log(`\n⚠ ${major.length} major mismatches need review.`);
  process.exit(1);
}
