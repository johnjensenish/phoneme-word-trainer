import type { AgeTierRule } from './types'

export const ageTierRules: AgeTierRule[] = [
  {
    label: "12–18 mo",
    age_min_months: 12,
    age_max_months: 18,
    tier1_sound_ids: ["P", "B", "M", "H", "W"],
    tier2_sound_ids: ["N", "D", "Y"],
    tier3_sound_ids: ["G", "K", "T", "F", "NG", "S", "Z", "L", "R", "SH", "CH", "J", "TH_VOICELESS", "TH_VOICED", "V"],
    expected_processes: ["reduplication", "final_c_del", "assimilation", "cluster_red", "fronting", "stopping"],
    focus_notes: "Vocabulary building. Animal sounds, social words. Short CV words. Lots of repetition. Focus on Tier 1 CV words.",
    recommended_word_types: "CV words: hi, no, bye, moo, baa, boo, me, up. Sounds: woof, neigh, beep. Social: mama, dada."
  },
  {
    label: "18–24 mo",
    age_min_months: 18,
    age_max_months: 24,
    tier1_sound_ids: ["P", "B", "M", "N", "H", "W", "D"],
    tier2_sound_ids: ["G", "K", "T", "F", "Y"],
    tier3_sound_ids: ["NG", "S", "Z", "L", "R", "SH", "CH", "J", "TH_VOICELESS", "TH_VOICED", "V"],
    expected_processes: ["final_c_del", "fronting", "stopping", "cluster_red", "weak_syl_del", "assimilation"],
    focus_notes: "Expanding vocabulary rapidly. CVC words becoming possible. Mix nouns, actions, social words. Beginning 2-word combos.",
    recommended_word_types: "CVC: bed, hat, hop, dog, pop, bus. CV: go, bee, hi. Actions: more, want, push. Requesting: mine, help."
  },
  {
    label: "24–30 mo",
    age_min_months: 24,
    age_max_months: 30,
    tier1_sound_ids: ["P", "B", "M", "N", "H", "W", "D", "T"],
    tier2_sound_ids: ["G", "K", "F", "NG", "Y"],
    tier3_sound_ids: ["S", "Z", "L", "R", "SH", "CH", "J", "TH_VOICELESS", "TH_VOICED", "V"],
    expected_processes: ["fronting", "stopping", "cluster_red", "weak_syl_del", "gliding"],
    focus_notes: "Sound targeting. Fronting pairs (cat vs tat). Rhyme awareness emerging. Multi-word combos. Final consonants solidifying.",
    recommended_word_types: "Fronting targets: cat, cup, go, key, kick. Rhyme sets: cat/bat/hat. 2-word phrases: big dog, my cup, more milk."
  },
  {
    label: "30–36 mo",
    age_min_months: 30,
    age_max_months: 36,
    tier1_sound_ids: ["P", "B", "M", "N", "H", "W", "D", "T", "G", "K", "F", "NG", "Y"],
    tier2_sound_ids: ["S", "Z", "SH", "CH", "J"],
    tier3_sound_ids: ["L", "R", "TH_VOICELESS", "TH_VOICED", "V"],
    expected_processes: ["stopping", "cluster_red", "gliding", "weak_syl_del"],
    focus_notes: "Fricative practice. Longer words. Syllable segmentation. Rhyme production. Most single consonants mastered.",
    recommended_word_types: "Fricatives: sun, shoe, fish, cheese, juice. Multi-syllable: banana, open, water. Clusters: exposure only."
  },
  {
    label: "36–42 mo",
    age_min_months: 36,
    age_max_months: 42,
    tier1_sound_ids: ["P", "B", "M", "N", "H", "W", "D", "T", "G", "K", "F", "NG", "Y", "S", "Z", "SH", "CH", "J", "V"],
    tier2_sound_ids: ["L", "R", "TH_VOICELESS", "TH_VOICED", "BL", "BR", "TR", "PL", "FR", "GR", "DR", "FL", "GL", "KR"],
    tier3_sound_ids: ["SP", "ST", "SN", "SW", "SK", "SL"],
    expected_processes: ["cluster_red", "gliding"],
    focus_notes: "Cluster introduction. Initial blends. L and R practice in simple words. Phoneme isolation becoming possible.",
    recommended_word_types: "Clusters: blue, truck, green, frog, plane. L words: light, ball, yellow. R words: red, run, rain, car."
  },
  {
    label: "42–48 mo",
    age_min_months: 42,
    age_max_months: 48,
    tier1_sound_ids: ["P", "B", "M", "N", "H", "W", "D", "T", "G", "K", "F", "NG", "Y", "S", "Z", "SH", "CH", "J", "V", "BL", "BR", "TR", "PL", "FR", "GR", "DR", "FL", "GL", "KR"],
    tier2_sound_ids: ["R", "L", "TH_VOICELESS", "TH_VOICED", "SP", "ST", "SN", "SW", "SK", "SL"],
    tier3_sound_ids: [],
    expected_processes: ["gliding", "cluster_red"],
    focus_notes: "R practice. /s/ blends. Multi-syllable words with clusters. Phoneme blending and segmenting emerging.",
    recommended_word_types: "/s/ clusters: spoon, star, snake, swim, skip. R words: rain, car, bird. Phoneme games: 'what starts with /b/?'"
  },
  {
    label: "48–60 mo",
    age_min_months: 48,
    age_max_months: 60,
    tier1_sound_ids: ["P", "B", "M", "N", "H", "W", "D", "T", "G", "K", "F", "NG", "Y", "S", "Z", "SH", "CH", "J", "V", "BL", "BR", "TR", "PL", "FR", "GR", "DR", "FL", "GL", "KR", "SP", "ST", "SN", "SW", "SK", "SL"],
    tier2_sound_ids: ["TH_VOICELESS", "TH_VOICED", "R"],
    tier3_sound_ids: [],
    expected_processes: [],
    focus_notes: "Phoneme segmentation. Letter-sound mapping. Bridge to reading. Multi-syllable fluency. Full phoneme drills now appropriate.",
    recommended_word_types: "Full phoneme drills. Letter cards alongside sound cards. Rhyme production. Onset segmentation tasks."
  },
]
