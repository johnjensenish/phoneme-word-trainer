/**
 * Validate word metadata against computed values from IPA.
 *
 * Checks syllable_count, consonant_ids, hardest_sound_id, and cluster_ids
 * for every word in words.ts using the same logic as add-word.ts.
 *
 * Usage:
 *   bun run scripts/validate-words.ts              # full report
 *   bun run scripts/validate-words.ts --field syllable_count  # single field
 *   bun run scripts/validate-words.ts --summary    # counts only
 *
 * Requires: no external dependencies
 */
import { words } from "../src/data/words";

const VOWELS = new Set("aɑæʌəɛeɪiɔoʊuɝɚɜ".split(""));
const DIPHTHONGS = ["aɪ", "aʊ", "eɪ", "oʊ", "ɔɪ", "ɪə", "ʊə", "eə"];

const IPA_TO_SOUND: Record<string, string> = {
  p: "P", b: "B", t: "T", d: "D", k: "K", ɡ: "G", g: "G",
  m: "M", n: "N", ŋ: "NG",
  f: "F", v: "V", s: "S", z: "Z", h: "H",
  ʃ: "SH", ʒ: "SH",
  tʃ: "CH", dʒ: "J",
  θ: "TH_VOICELESS", ð: "TH_VOICED",
  ɹ: "R", r: "R", l: "L", w: "W", j: "Y",
};

const CLUSTERS: Record<string, string> = {
  bl: "BL", br: "BR", dr: "DR", fl: "FL", fr: "FR",
  gl: "GL", gr: "GR", kl: "KL", kr: "KR", kw: "KW",
  pl: "PL", sk: "SK", sl: "SL", sn: "SN", sp: "SP",
  st: "ST", sw: "SW", tr: "TR", θr: "THR", vr: "VR",
  ks: "KS", kt: "KT", ft: "FT", lk: "LK", lp: "LP",
  mp: "MP", nd: "ND", ŋk: "NGK",
};

const SOUND_DIFFICULTY: Record<string, number> = {
  P: 1, B: 1, M: 1, N: 1, W: 1, H: 1, D: 2, T: 2, K: 3, G: 3,
  NG: 3, F: 4, Y: 4, L: 5, S: 5, Z: 5, SH: 6, CH: 6, J: 6,
  V: 7, TH_VOICELESS: 8, TH_VOICED: 8, R: 9,
};

// ── Parse args ──────────────────────────────────────────────────────

const fieldFilter = (() => {
  const idx = process.argv.indexOf("--field");
  return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : undefined;
})();
const summaryOnly = process.argv.includes("--summary");

// ── Analysis functions (must match add-word.ts) ─────────────────────

function countVowelNuclei(ipa: string): number {
  const stripped = ipa.replace(/[.ˈˌːˑ\s\-]/g, "");
  let count = 0;
  let i = 0;
  while (i < stripped.length) {
    const pair = stripped.slice(i, i + 2);
    if (DIPHTHONGS.includes(pair)) {
      count++;
      i += 2;
      continue;
    }
    if (VOWELS.has(stripped[i])) {
      count++;
      i++;
      while (i < stripped.length && VOWELS.has(stripped[i])) i++;
      continue;
    }
    i++;
  }
  return Math.max(1, count);
}

function analyzeConsonants(ipa: string): {
  consonant_ids: string[];
  cluster_ids: string[];
  hardest_sound_id: string;
} {
  const stripped = ipa.replace(/[.ˈˌː\s]/g, "");
  const consonant_ids: string[] = [];
  const cluster_ids: string[] = [];

  // Rhotacized vowels (ɝ, ɚ) contain an embedded R
  const rCount = (stripped.match(/[ɝɚ]/g) || []).length;

  // Find clusters, normalize IPA variants
  const forClusters = stripped.replace(/ɹ/g, "r").replace(/ɡ/g, "g").replace(/dʒ/g, "J");
  for (const [pattern, id] of Object.entries(CLUSTERS)) {
    if (forClusters.includes(pattern) && !cluster_ids.includes(id)) {
      cluster_ids.push(id);
    }
  }

  let i = 0;
  while (i < stripped.length) {
    if (stripped[i] === "ɝ" || stripped[i] === "ɚ") { i++; continue; }

    const di = stripped.slice(i, i + 2);
    const mono = stripped[i];
    let soundId: string | undefined;
    let advance = 1;

    if (IPA_TO_SOUND[di]) { soundId = IPA_TO_SOUND[di]; advance = 2; }
    else if (IPA_TO_SOUND[mono]) { soundId = IPA_TO_SOUND[mono]; advance = 1; }

    if (soundId && !VOWELS.has(mono)) {
      consonant_ids.push(soundId);
    }
    i += advance;
  }

  // Add R for each rhotacized vowel
  for (let r = 0; r < rCount; r++) {
    consonant_ids.push("R");
  }

  let hardest = consonant_ids[0] || "P";
  let hardestDiff = 0;
  for (const cid of consonant_ids) {
    const diff = SOUND_DIFFICULTY[cid] || 0;
    if (diff > hardestDiff) { hardestDiff = diff; hardest = cid; }
  }

  return { consonant_ids, cluster_ids, hardest_sound_id: hardest };
}

// ── Run validation ──────────────────────────────────────────────────

interface Issue {
  word_id: string;
  word: string;
  field: string;
  stored: string;
  computed: string;
}

const issues: Issue[] = [];

for (const w of words) {
  // Syllable count
  if (!fieldFilter || fieldFilter === "syllable_count") {
    const computed = countVowelNuclei(w.ipa);
    if (computed !== w.syllable_count) {
      issues.push({
        word_id: w.word_id, word: w.word, field: "syllable_count",
        stored: String(w.syllable_count), computed: String(computed),
      });
    }
  }

  const analysis = analyzeConsonants(w.ipa);

  // Consonant IDs (sorted set comparison)
  if (!fieldFilter || fieldFilter === "consonant_ids") {
    const stored = [...w.consonant_ids].sort().join(",");
    const computed = [...analysis.consonant_ids].sort().join(",");
    if (stored !== computed) {
      issues.push({
        word_id: w.word_id, word: w.word, field: "consonant_ids",
        stored, computed,
      });
    }
  }

  // Hardest sound
  if (!fieldFilter || fieldFilter === "hardest_sound_id") {
    if (analysis.hardest_sound_id !== w.hardest_sound_id) {
      issues.push({
        word_id: w.word_id, word: w.word, field: "hardest_sound_id",
        stored: w.hardest_sound_id, computed: analysis.hardest_sound_id,
      });
    }
  }

  // Cluster IDs (sorted set comparison)
  if (!fieldFilter || fieldFilter === "cluster_ids") {
    const stored = [...w.cluster_ids].sort().join(",");
    const computed = [...analysis.cluster_ids].sort().join(",");
    if (stored !== computed) {
      issues.push({
        word_id: w.word_id, word: w.word, field: "cluster_ids",
        stored: stored || "(none)", computed: computed || "(none)",
      });
    }
  }
}

// ── Report ──────────────────────────────────────────────────────────

const fields = [...new Set(issues.map(i => i.field))];
const fieldCounts: Record<string, { match: number; diff: number }> = {};
for (const field of ["syllable_count", "consonant_ids", "hardest_sound_id", "cluster_ids"]) {
  if (fieldFilter && fieldFilter !== field) continue;
  const diffs = issues.filter(i => i.field === field).length;
  fieldCounts[field] = { match: words.length - diffs, diff: diffs };
}

console.log(`=== Word Metadata Validation ===\n`);
console.log(`Words checked: ${words.length}\n`);
console.log(`Field              Match    Diff`);
console.log(`─────────────────  ───────  ────`);
for (const [field, counts] of Object.entries(fieldCounts)) {
  const pct = ((counts.match / words.length) * 100).toFixed(1);
  console.log(`${field.padEnd(19)} ${String(counts.match).padEnd(8)} ${counts.diff}  (${pct}%)`);
}
console.log();

if (!summaryOnly) {
  for (const field of fields) {
    const fieldIssues = issues.filter(i => i.field === field);
    console.log(`--- ${field} (${fieldIssues.length} differences) ---`);
    for (const issue of fieldIssues.slice(0, 40)) {
      console.log(`  ${issue.word_id.padEnd(8)} ${issue.word.padEnd(20)} stored: ${issue.stored.padEnd(30)} computed: ${issue.computed}`);
    }
    if (fieldIssues.length > 40) {
      console.log(`  ... and ${fieldIssues.length - 40} more`);
    }
    console.log();
  }
}

if (issues.length === 0) {
  console.log("All words pass validation!");
}
