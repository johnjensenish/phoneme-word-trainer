#!/usr/bin/env bun
/**
 * Add a word to the phoneme trainer with auto-generated IPA and metadata.
 *
 * Uses espeak-ng for IPA verification (PNW American English).
 * Prompts for category and emoji, auto-generates consonant analysis.
 *
 * Usage:
 *   bun run scripts/add-word.ts "butter"
 *   bun run scripts/add-word.ts "maple tree" --category nature --emoji 🍁
 *   bun run scripts/add-word.ts "jump" --category actions --type verb --emoji 🦘 --yes
 *
 * Options:
 *   --category <cat>   Category (actions, animals, body, clothing, colors, describing,
 *                       feelings, food, furniture, house, nature, numbers, people,
 *                       shapes, spatial, time, toys, vehicles, weather)
 *   --type <type>       Word type (noun, verb, adjective, adverb, exclamation, etc.)
 *   --emoji <emoji>     Emoji for the visual hint
 *   --yes               Skip confirmation prompt
 *   --dry-run           Show what would be added without modifying files
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { words } from "../src/data/words";

// ── Config ──────────────────────────────────────────────────────────

const CATEGORIES = [
  "actions", "animals", "body", "clothing", "colors", "describing",
  "feelings", "food", "furniture", "house", "nature", "numbers",
  "people", "shapes", "spatial", "time", "toys", "vehicles", "weather",
] as const;

const CATEGORY_PREFIXES: Record<string, string> = {
  actions: "ACT", animals: "ANI", body: "BOD", clothing: "CLO",
  colors: "COL", describing: "DES", feelings: "FEE", food: "FOO",
  furniture: "FUR", house: "OBJ", nature: "NAT", numbers: "NUM",
  people: "PPL", shapes: "SHP", spatial: "SPA", time: "TIM",
  toys: "TOY", vehicles: "VEH", weather: "WEA",
};

const CATEGORY_DEFAULT_TYPE: Record<string, string> = {
  actions: "verb", animals: "noun", body: "noun", clothing: "noun",
  colors: "adjective", describing: "adjective", feelings: "adjective",
  food: "noun", furniture: "noun", house: "noun", nature: "noun",
  numbers: "noun", people: "noun", shapes: "noun", spatial: "adverb",
  time: "noun", toys: "noun", vehicles: "noun", weather: "noun",
};

// IPA consonant → sound ID mapping
const IPA_TO_SOUND: Record<string, string> = {
  p: "P", b: "B", t: "T", d: "D", k: "K", ɡ: "G", g: "G",
  m: "M", n: "N", ŋ: "NG",
  f: "F", v: "V", s: "S", z: "Z", h: "H",
  ʃ: "SH", ʒ: "SH", // simplify
  tʃ: "CH", dʒ: "J",
  θ: "TH_VOICELESS", ð: "TH_VOICED",
  ɹ: "R", r: "R", l: "L", w: "W", j: "Y",
};

// Common clusters
const CLUSTERS: Record<string, string> = {
  bl: "BL", br: "BR", dr: "DR", fl: "FL", fr: "FR",
  gl: "GL", gr: "GR", kl: "KL", kr: "KR", kw: "KW",
  pl: "PL", sk: "SK", sl: "SL", sn: "SN", sp: "SP",
  st: "ST", sw: "SW", tr: "TR", θr: "THR", vr: "VR",
  ks: "KS", kt: "KT", ft: "FT", lk: "LK", lp: "LP",
  mp: "MP", nd: "ND", ŋk: "NGK",
};

// Vowels for word shape
const VOWELS = new Set("aɑæʌəɛeɪiɔoʊuɝɚɜ".split(""));

// Sound acquisition difficulty (higher = harder/later)
const SOUND_DIFFICULTY: Record<string, number> = {
  P: 1, B: 1, M: 1, N: 1, W: 1, H: 1, D: 2, T: 2, K: 3, G: 3,
  NG: 3, F: 4, Y: 4, L: 5, S: 5, Z: 5, SH: 6, CH: 6, J: 6,
  V: 7, TH_VOICELESS: 8, TH_VOICED: 8, R: 9,
};

// ── Parse args ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
const word = args.find(a => !a.startsWith("--"))?.toLowerCase();

if (!word) {
  console.error("Usage: bun run scripts/add-word.ts <word> [options]");
  console.error("  --category <cat>  --type <type>  --emoji <emoji>  --yes  --dry-run");
  process.exit(1);
}

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

const categoryArg = getArg("--category");
const typeArg = getArg("--type");
const emojiArg = getArg("--emoji");
const autoConfirm = args.includes("--yes");
const dryRun = args.includes("--dry-run");

// ── Check if word exists ────────────────────────────────────────────

const existing = words.find(w => w.word === word);
if (existing) {
  console.log(`"${word}" already exists (${existing.word_id}, IPA: ${existing.ipa})`);
  process.exit(0);
}

// ── Get IPA from espeak-ng ──────────────────────────────────────────

let espeakIPA: string;
try {
  espeakIPA = execSync(`espeak-ng -v en-us --ipa -q "${word.replace(/"/g, '\\"')}"`, {
    encoding: "utf-8",
  }).trim();
} catch {
  console.error(`ERROR: espeak-ng failed for "${word}". Is it installed?`);
  process.exit(1);
}

// Clean up espeak IPA: remove stress marks, keep the sounds
const cleanIPA = espeakIPA
  .replace(/[ˈˌ]/g, "")    // remove stress marks
  .replace(/ɹ/g, "ɹ")      // keep ɹ as-is
  .replace(/ɾ/g, "t")       // normalize flap to t
  .replace(/ɐ/g, "ə")       // near-open central → schwa
  .replace(/ᵻ/g, "ɪ")       // barred i → ɪ
  .replace(/ʔ/g, "t");      // glottal stop → t

// Diphthongs (count as single vowel nucleus)
const DIPHTHONGS = ["aɪ", "aʊ", "eɪ", "oʊ", "ɔɪ", "ɪə", "ʊə", "eə"];

/** Count vowel nuclei in IPA string (= syllable count) */
function countVowelNuclei(ipa: string): number {
  const stripped = ipa.replace(/[.ˈˌːˑ\s\-]/g, "");
  let count = 0;
  let i = 0;
  while (i < stripped.length) {
    // Check for diphthongs first
    const pair = stripped.slice(i, i + 2);
    if (DIPHTHONGS.includes(pair)) {
      count++;
      i += 2;
      continue;
    }
    if (VOWELS.has(stripped[i])) {
      count++;
      i++;
      // Skip consecutive vowels that aren't diphthongs (rare)
      while (i < stripped.length && VOWELS.has(stripped[i])) i++;
      continue;
    }
    i++;
  }
  return Math.max(1, count);
}

/**
 * Add syllable breaks to IPA.
 * Uses espeak stress marks as primary break hints, then fills in
 * remaining breaks by finding vowel-consonant-vowel boundaries.
 */
function addSyllableBreaks(rawIpa: string, clean: string): string {
  const nuclei = countVowelNuclei(clean);
  if (nuclei <= 1) return clean; // single syllable, no breaks needed

  // Step 1: Use stress marks from espeak as syllable boundaries
  const result: string[] = [];
  let ci = 0;
  let breakCount = 0;

  for (let ri = 0; ri < rawIpa.length; ri++) {
    const ch = rawIpa[ri];
    if (ch === "ˈ" || ch === "ˌ") {
      if (ci > 0) {
        result.push(".");
        breakCount++;
      }
    } else {
      if (ci < clean.length) {
        result.push(clean[ci]);
        ci++;
      }
    }
  }
  while (ci < clean.length) {
    result.push(clean[ci]);
    ci++;
  }

  let ipa = result.join("");

  // Step 2: If we don't have enough breaks, add more at VCV boundaries
  const currentBreaks = (ipa.match(/\./g) || []).length;
  if (currentBreaks < nuclei - 1) {
    // Split into chars, find VCV boundaries and insert breaks
    const chars = [...ipa];
    const needed = nuclei - 1 - currentBreaks;
    let added = 0;

    for (let i = 1; i < chars.length - 1 && added < needed; i++) {
      if (chars[i] === ".") continue;

      // Look for consonant(s) between two vowel regions
      // Find if we're at a consonant between vowels
      const isConsonant = !VOWELS.has(chars[i]) && chars[i] !== "." && chars[i] !== "ː";
      if (!isConsonant) continue;

      // Check if there's a vowel before us (scanning back past consonants)
      let hasVowelBefore = false;
      for (let j = i - 1; j >= 0; j--) {
        if (chars[j] === ".") break;
        if (VOWELS.has(chars[j])) { hasVowelBefore = true; break; }
      }
      if (!hasVowelBefore) continue;

      // Check if there's a vowel after us (scanning forward past consonants)
      let hasVowelAfter = false;
      for (let j = i + 1; j < chars.length; j++) {
        if (chars[j] === ".") break;
        if (VOWELS.has(chars[j])) { hasVowelAfter = true; break; }
      }
      if (!hasVowelAfter) continue;

      // Insert break before this consonant
      chars.splice(i, 0, ".");
      added++;
    }
    ipa = chars.join("");
  }

  return ipa;
}

const ipa = word.includes(" ")
  ? word.split(" ").map((w) => {
      const partIpa = execSync(`espeak-ng -v en-us --ipa -q "${w}"`, { encoding: "utf-8" }).trim();
      const partClean = partIpa
        .replace(/[ˈˌ]/g, "").replace(/ɾ/g, "t").replace(/ɐ/g, "ə")
        .replace(/ᵻ/g, "ɪ").replace(/ʔ/g, "t");
      return addSyllableBreaks(partIpa, partClean);
    }).join(" ")
  : addSyllableBreaks(espeakIPA, cleanIPA);

// ── Check for British-isms ──────────────────────────────────────────

if (ipa.includes("ɒ")) {
  console.error(`WARNING: IPA contains British ɒ. Replacing with ɑː for PNW American.`);
}
const finalIPA = ipa.replace(/ɒ/g, "ɑː");

// ── Analyze consonants ──────────────────────────────────────────────

function analyzeConsonants(ipa: string): {
  consonant_ids: string[];
  consonant_positions: string[];
  cluster_ids: string[];
  hardest_sound_id: string;
} {
  const stripped = ipa.replace(/[.ˈˌː\s]/g, "");
  const consonant_ids: string[] = [];
  const consonant_positions: string[] = [];
  const cluster_ids: string[] = [];

  // Rhotacized vowels (ɝ, ɚ) contain an embedded R for speech therapy purposes
  const rCount = (stripped.match(/[ɝɚ]/g) || []).length;

  // Normalize ɹ → r for cluster detection
  const forClusters = stripped.replace(/ɹ/g, "r");

  // Find clusters in both onsets and codas
  // Normalize IPA variants for matching against cluster patterns
  const forClusters = stripped.replace(/ɹ/g, "r").replace(/ɡ/g, "g").replace(/dʒ/g, "J");
  for (const [pattern, id] of Object.entries(CLUSTERS)) {
    if (forClusters.includes(pattern) && !cluster_ids.includes(id)) {
      cluster_ids.push(id);
    }
  }

  // Find consonants with positions
  let i = 0;
  let lastVowelPos = -1;
  let firstVowelPos = stripped.length;

  // Find first and last vowel positions (including ɝɚ as vowels)
  for (let j = 0; j < stripped.length; j++) {
    if (VOWELS.has(stripped[j]) || stripped[j] === "ɝ" || stripped[j] === "ɚ") {
      if (j < firstVowelPos) firstVowelPos = j;
      lastVowelPos = j;
    }
  }

  while (i < stripped.length) {
    // Skip rhotacized vowels (R is added separately below)
    if (stripped[i] === "ɝ" || stripped[i] === "ɚ") {
      i++;
      continue;
    }

    // Try digraphs first
    const di = stripped.slice(i, i + 2);
    const mono = stripped[i];

    let soundId: string | undefined;
    let advance = 1;

    if (IPA_TO_SOUND[di]) {
      soundId = IPA_TO_SOUND[di];
      advance = 2;
    } else if (IPA_TO_SOUND[mono]) {
      soundId = IPA_TO_SOUND[mono];
      advance = 1;
    }

    if (soundId && !VOWELS.has(mono)) {
      consonant_ids.push(soundId);

      // Determine position
      if (i < firstVowelPos) {
        consonant_positions.push("initial");
      } else if (i > lastVowelPos) {
        consonant_positions.push("final");
      } else {
        consonant_positions.push("initial");
      }
    }

    i += advance;
  }

  // Add R for each rhotacized vowel
  for (let r = 0; r < rCount; r++) {
    consonant_ids.push("R");
    consonant_positions.push("final");
  }

  // Find hardest sound
  let hardest = consonant_ids[0] || "P";
  let hardestDiff = 0;
  for (const cid of consonant_ids) {
    const diff = SOUND_DIFFICULTY[cid] || 0;
    if (diff > hardestDiff) {
      hardestDiff = diff;
      hardest = cid;
    }
  }

  return { consonant_ids, consonant_positions, cluster_ids, hardest_sound_id: hardest };
}

const analysis = analyzeConsonants(finalIPA);

// ── Compute word shape ──────────────────────────────────────────────

function computeWordShape(ipa: string): string {
  const parts = ipa.split(/[\s]/);
  return parts.map(part => {
    const syllables = part.split(".");
    return syllables.map(syl => {
      let shape = "";
      for (const ch of syl.replace(/ː/g, "")) {
        if (VOWELS.has(ch)) shape += "V";
        else if (ch.match(/[a-zɹðθʃʒŋɡ]/)) shape += "C";
        // Skip diacritics
      }
      return shape;
    }).join(".");
  }).join(" ");
}

const wordShape = computeWordShape(finalIPA);

// ── Compute syllable count ──────────────────────────────────────────

const syllableCount = countVowelNuclei(finalIPA);

// ── Determine category and type ─────────────────────────────────────

const category = categoryArg || "house"; // default, user should specify
const wordType = typeArg || CATEGORY_DEFAULT_TYPE[category] || "noun";

if (!CATEGORIES.includes(category as any)) {
  console.error(`ERROR: Unknown category "${category}". Valid: ${CATEGORIES.join(", ")}`);
  process.exit(1);
}

// ── Generate word ID ────────────────────────────────────────────────

const prefix = CATEGORY_PREFIXES[category];
const existingIds = words
  .filter(w => w.word_id.startsWith(prefix))
  .map(w => parseInt(w.word_id.slice(prefix.length)));
const nextId = Math.max(0, ...existingIds) + 1;
const wordId = `${prefix}${String(nextId).padStart(3, "0")}`;

// ── Visual hint ─────────────────────────────────────────────────────

const visualHint = `photo_${word.replace(/\s+/g, "_")}`;
const emoji = emojiArg || "❓";

// ── Build entry ─────────────────────────────────────────────────────

const entry = {
  word_id: wordId,
  word,
  ipa: finalIPA,
  category,
  word_type: wordType,
  word_shape: wordShape,
  syllable_count: syllableCount,
  consonant_ids: analysis.consonant_ids,
  consonant_positions: analysis.consonant_positions,
  hardest_sound_id: analysis.hardest_sound_id,
  cluster_ids: analysis.cluster_ids,
  visual_hint: visualHint,
  rhyme_group: "",
  notes: "",
};

// ── Display ─────────────────────────────────────────────────────────

console.log(`\n=== Adding "${word}" ===\n`);
console.log(`  espeak-ng IPA: ${espeakIPA}`);
console.log(`  Final IPA:     ${finalIPA}`);
console.log(`  Word ID:       ${wordId}`);
console.log(`  Category:      ${category}`);
console.log(`  Word type:     ${wordType}`);
console.log(`  Word shape:    ${wordShape}`);
console.log(`  Syllables:     ${syllableCount}`);
console.log(`  Consonants:    ${analysis.consonant_ids.join(", ")}`);
console.log(`  Positions:     ${analysis.consonant_positions.join(", ")}`);
console.log(`  Clusters:      ${analysis.cluster_ids.join(", ") || "(none)"}`);
console.log(`  Hardest:       ${analysis.hardest_sound_id}`);
console.log(`  Emoji:         ${emoji}`);
console.log();

if (dryRun) {
  console.log("(dry run — no files modified)");
  console.log("\nGenerated entry:");
  console.log(JSON.stringify(entry, null, 2));
  process.exit(0);
}

// ── Write to words.ts ───────────────────────────────────────────────

const wordsPath = "src/data/words.ts";
const wordsContent = readFileSync(wordsPath, "utf-8");

// Find the closing bracket
const closingIdx = wordsContent.lastIndexOf("]");
if (closingIdx === -1) {
  console.error("ERROR: Could not find closing ] in words.ts");
  process.exit(1);
}

const newEntry = `  {
    word_id: "${entry.word_id}",
    word: "${entry.word}",
    ipa: "${entry.ipa}",
    category: "${entry.category}",
    word_type: "${entry.word_type}",
    word_shape: "${entry.word_shape}",
    syllable_count: ${entry.syllable_count},
    consonant_ids: [${entry.consonant_ids.map(s => `"${s}"`).join(", ")}],
    consonant_positions: [${entry.consonant_positions.map(s => `"${s}"`).join(", ")}],
    hardest_sound_id: "${entry.hardest_sound_id}",
    cluster_ids: [${entry.cluster_ids.map(s => `"${s}"`).join(", ")}],
    visual_hint: "${entry.visual_hint}",
    rhyme_group: "",
    notes: "",
  },\n`;

const newContent = wordsContent.slice(0, closingIdx) + newEntry + wordsContent.slice(closingIdx);
writeFileSync(wordsPath, newContent);

// ── Write to emojiMap.ts ────────────────────────────────────────────

const emojiPath = "src/data/emojiMap.ts";
const emojiContent = readFileSync(emojiPath, "utf-8");
const closingBrace = emojiContent.lastIndexOf("};");

if (closingBrace === -1) {
  console.error("ERROR: Could not find closing }; in emojiMap.ts");
  process.exit(1);
}

const newEmojiLine = `  ${visualHint}: "${emoji}",\n`;
const newEmojiContent = emojiContent.slice(0, closingBrace) + newEmojiLine + emojiContent.slice(closingBrace);
writeFileSync(emojiPath, newEmojiContent);

// ── Verify ──────────────────────────────────────────────────────────

try {
  const verify = execSync(`bun -e "const { words } = require('./src/data/words'); const w = words.find(x => x.word === '${word.replace(/'/g, "\\'")}'); console.log(w ? 'OK: ' + w.word_id : 'FAIL');"`, {
    encoding: "utf-8",
  }).trim();
  console.log(`Verification: ${verify}`);
} catch (e) {
  console.error("WARNING: Verification failed — check the generated entry for syntax errors.");
}

console.log(`\nDone! Added "${word}" as ${wordId}. Total words: ${words.length + 1}`);
if (emoji === "❓") {
  console.log(`NOTE: No emoji specified. Update ${visualHint} in emojiMap.ts or re-run with --emoji <emoji>`);
}
if (syllableCount >= 3) {
  console.log(`NOTE: ${syllableCount}+ syllables — verify syllable breaks in IPA are correct.`);
}
console.log(`TIP: Run 'bun run scripts/detect-ipa-changes.ts --major' to verify against dictionary.`);
