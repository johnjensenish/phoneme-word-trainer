import type { PhonologicalProcess } from './types'

export const processes: PhonologicalProcess[] = [
  {
    process_id: "final_c_del",
    name: "Final Consonant Deletion",
    description: "Dropping the last consonant in a word",
    example_input: "dog",
    example_output: "dah",
    resolves_by_months: 36,
    affected_sound_types: "All final consonants",
    notes: "Affects Tier 1 CVC words at younger ages. Normal until ~3 years."
  },
  {
    process_id: "cluster_red",
    name: "Cluster Reduction",
    description: "Simplifying a consonant cluster to one sound",
    example_input: "blue",
    example_output: "boo",
    resolves_by_months: 48,
    affected_sound_types: "All clusters; /s/ clusters resolve by ~60 months",
    notes: "All cluster words are exposure-only until 3+ years."
  },
  {
    process_id: "fronting",
    name: "Fronting (Velar)",
    description: "Back sounds (K,G) replaced with front sounds (T,D)",
    example_input: "cat",
    example_output: "tat",
    resolves_by_months: 42,
    affected_sound_types: "K→T, G→D",
    notes: "Core pattern for velar stops. Actively resolving 24–42 months."
  },
  {
    process_id: "stopping",
    name: "Stopping",
    description: "Fricatives replaced with stops",
    example_input: "fish",
    example_output: "pit",
    resolves_by_months: 36,
    affected_sound_types: "F→P, S→T, SH→T/D, V→B, Z→D, TH→T/D",
    notes: "Different fricatives resolve at different ages. F earliest (~36), TH latest (~84)."
  },
  {
    process_id: "gliding",
    name: "Gliding",
    description: "L or R replaced with W or Y",
    example_input: "red",
    example_output: "wed",
    resolves_by_months: 72,
    affected_sound_types: "L→W, R→W (sometimes L→Y)",
    notes: "One of the last processes to resolve. Affects all L and R words."
  },
  {
    process_id: "weak_syl_del",
    name: "Weak Syllable Deletion",
    description: "Dropping an unstressed syllable in a multi-syllable word",
    example_input: "banana",
    example_output: "nana",
    resolves_by_months: 48,
    affected_sound_types: "Multi-syllable words with unstressed syllables",
    notes: "Syllable clapping helps build awareness."
  },
  {
    process_id: "assimilation",
    name: "Assimilation",
    description: "One sound in a word becomes more like another nearby sound",
    example_input: "dog",
    example_output: "gog",
    resolves_by_months: 42,
    affected_sound_types: "Any consonant; velar and nasal assimilation most common",
    notes: "Can make CVC words sound wrong even with known sounds."
  },
  {
    process_id: "reduplication",
    name: "Reduplication",
    description: "Repeating a syllable",
    example_input: "water",
    example_output: "wawa",
    resolves_by_months: 30,
    affected_sound_types: "Multi-syllable words",
    notes: "Resolving by 24–30 months. Use words that ARE reduplicative (mama, boo-boo)."
  },
  {
    process_id: "voicing",
    name: "Pre-vocalic Voicing",
    description: "Voiceless consonant becomes voiced before a vowel",
    example_input: "pig",
    example_output: "big",
    resolves_by_months: 36,
    affected_sound_types: "P→B, T→D, K→G in initial position",
    notes: "Common in early speech. Usually resolves by 3."
  },
  {
    process_id: "deaffrication",
    name: "Deaffrication",
    description: "Affricate replaced with a fricative",
    example_input: "chip",
    example_output: "ship",
    resolves_by_months: 48,
    affected_sound_types: "CH→SH, J→ZH",
    notes: "Resolves by about 4 years."
  },
]
