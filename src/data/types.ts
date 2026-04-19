export interface Sound {
  sound_id: string;             // "P", "B", "BL", etc.
  label: string;                // "P", "BL", "TH (voiceless)"
  ipa: string;                  // "/p/", "/bl/"
  type: string;                 // "stop_voiceless", "cluster", etc.
  onset_months: number;         // age when sound starts emerging
  mastery_months: number;       // age when 90% of children have it
  fifty_pct_by_months: number;  // age when 50% of children have it
  ninety_pct_by_months: number; // age when 90% of children have it
  position_constraint: string;  // "any", "initial_only", "medial_final"
  notes: string;
}

export interface Word {
  word: string;
  ipa: string;
  category: string;
  word_type: string;
  word_shape: string;
  syllable_count: number;
  consonant_ids: string[];
  consonant_positions: string[];
  hardest_sound_id: string;
  cluster_ids: string[];
  visual_hint: string;
  rhyme_group: string;
  notes: string;
}

export interface AgeTierRule {
  label: string;
  age_min_months: number;
  age_max_months: number;
  tier1_sound_ids: string[];
  tier2_sound_ids: string[];
  tier3_sound_ids: string[];
  expected_processes: string[];
  focus_notes: string;
  recommended_word_types: string;
}

export interface PhonologicalProcess {
  process_id: string;
  name: string;
  description: string;
  example_input: string;
  example_output: string;
  resolves_by_months: number;
  affected_sound_types: string;
  notes: string;
}

export interface RhymeGroup {
  rhyme_group_id: string;
  rhyme_pattern: string;
  words: string[];
  target_sounds: string;
  notes: string;
}

export type Tier = 1 | 2 | 3;
export type DrillMode = "produce" | "guided" | "expose";
export type SoundOverride = "mastered" | "age-based" | "not-yet";

export interface ComputedWordCard {
  word: Word;
  tier: Tier;
  drill_mode: DrillMode;
  phoneme_display: string;
  expected_approximation: string;
  active_processes: PhonologicalProcess[];
  /** Per-sound tier map: sound_id → Tier (1/2/3) for coloring phoneme pills */
  soundTiers: Record<string, Tier>;
}
