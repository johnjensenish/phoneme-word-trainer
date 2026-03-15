import type { RhymeGroup } from './types'

export const rhymeGroups: RhymeGroup[] = [
  {
    rhyme_group_id: "bat_cat_hat",
    rhyme_pattern: "-at",
    word_ids: ["ANI011", "ANI012", "OBJ002"],
    words: "bat, cat, hat",
    target_sounds: "B, K, H, T",
    notes: "Classic rhyme set. Fronting contrast: cat vs bat."
  },
  {
    rhyme_group_id: "pig_big_dig",
    rhyme_pattern: "-ig",
    word_ids: ["ANI010", "DES001"],
    words: "pig, big",
    target_sounds: "P, B, G",
    notes: "G in final position. Could add 'dig', 'wig'."
  },
  {
    rhyme_group_id: "bug_mug_hug",
    rhyme_pattern: "-ug",
    word_ids: ["ANI007"],
    words: "bug",
    target_sounds: "B, G",
    notes: "Foundation for set. Add 'mug', 'hug', 'rug'."
  },
  {
    rhyme_group_id: "bed_red",
    rhyme_pattern: "-ed",
    word_ids: ["OBJ001", "COL005"],
    words: "bed, red",
    target_sounds: "B, R, D",
    notes: "Cross-tier rhyme: B is Tier 1, R is Tier 3."
  },
  {
    rhyme_group_id: "pop_hop_mop",
    rhyme_pattern: "-op",
    word_ids: ["ACT018", "ACT020", "OBJ005"],
    words: "pop, hop, mop",
    target_sounds: "P, H, M",
    notes: "All Tier 1 initials. Great starter rhyme set."
  },
  {
    rhyme_group_id: "in_bin",
    rhyme_pattern: "-in",
    word_ids: ["ACT033", "OBJ007"],
    words: "in, bin",
    target_sounds: "B, N",
    notes: "Could add 'pin', 'win', 'fin'."
  },
  {
    rhyme_group_id: "up_cup",
    rhyme_pattern: "-up",
    word_ids: ["ACT001", "OBJ009"],
    words: "up, cup",
    target_sounds: "K, P",
    notes: "Fronting contrast opportunity."
  },
  {
    rhyme_group_id: "boo_moo",
    rhyme_pattern: "-oo",
    word_ids: ["ACT007", "ANI002"],
    words: "boo, moo",
    target_sounds: "B, M",
    notes: "Easy CV rhymes. Could add 'moo', 'zoo', 'who'."
  },
  {
    rhyme_group_id: "go_no",
    rhyme_pattern: "-o",
    word_ids: ["ACT015", "ACT002"],
    words: "go, no",
    target_sounds: "G, N",
    notes: "CV rhyme pair. Fronting relevant for 'go'."
  },
  {
    rhyme_group_id: "hi_bye",
    rhyme_pattern: "-ai",
    word_ids: ["ACT003", "ACT004"],
    words: "hi, bye",
    target_sounds: "H, B",
    notes: "Social word pair. Both Tier 1."
  },
  {
    rhyme_group_id: "bee_me_pee",
    rhyme_pattern: "-ee",
    word_ids: ["ANI001", "ACT005", "OBJ020", "BOD007"],
    words: "bee, me, pee, knee",
    target_sounds: "B, M, P, N",
    notes: "All Tier 1 initials. Good set."
  },
  {
    rhyme_group_id: "hen_pen_ten",
    rhyme_pattern: "-en",
    word_ids: ["ANI006", "OBJ024", "NUM010"],
    words: "hen, pen, ten",
    target_sounds: "H, P, T, N",
    notes: "All early sounds. Great starter rhyme set."
  },
  {
    rhyme_group_id: "van_pan_man",
    rhyme_pattern: "-an",
    word_ids: ["VEH007", "OBJ006"],
    words: "van, pan",
    target_sounds: "V, P, N",
    notes: "Cross-tier: V is late, P is early."
  },
  {
    rhyme_group_id: "ham_jam_yam",
    rhyme_pattern: "-am",
    word_ids: ["FOO004"],
    words: "ham",
    target_sounds: "H, M",
    notes: "Foundation. Add 'jam', 'yam', 'dam'."
  },
  {
    rhyme_group_id: "run_fun_sun",
    rhyme_pattern: "-un",
    word_ids: ["ACT021", "NUM001"],
    words: "run, one",
    target_sounds: "R, W, N",
    notes: "Cross-tier: R is late, W/N early."
  },
  {
    rhyme_group_id: "goat_boat",
    rhyme_pattern: "-oat",
    word_ids: ["ANI013", "VEH003"],
    words: "goat, boat",
    target_sounds: "G, B, T",
    notes: "Fronting contrast for G."
  },
  {
    rhyme_group_id: "duck_truck",
    rhyme_pattern: "-uck",
    word_ids: ["ANI009", "VEH008"],
    words: "duck, truck",
    target_sounds: "D, TR, K",
    notes: "Cluster contrast: duck vs truck."
  },
  {
    rhyme_group_id: "nose_toes",
    rhyme_pattern: "-ose/-oes",
    word_ids: ["BOD003", "BOD006"],
    words: "nose, toes",
    target_sounds: "N, T, Z",
    notes: "Body parts pair."
  },
  {
    rhyme_group_id: "fall_ball",
    rhyme_pattern: "-all",
    word_ids: ["ACT039", "OBJ012"],
    words: "fall, ball",
    target_sounds: "F, B, L",
    notes: "L in final position."
  },
  {
    rhyme_group_id: "sit_hit_bit",
    rhyme_pattern: "-it",
    word_ids: ["ACT038"],
    words: "sit",
    target_sounds: "S, T",
    notes: "Foundation. Add 'hit', 'bit', 'kit', 'fit'."
  },
  {
    rhyme_group_id: "door_more",
    rhyme_pattern: "-or",
    word_ids: ["OBJ004", "ACT011", "NUM004"],
    words: "door, more, four",
    target_sounds: "D, M, F, R",
    notes: "R in final position. Cross-tier with F."
  },
  {
    rhyme_group_id: "jump_bump",
    rhyme_pattern: "-ump",
    word_ids: ["ACT037", "ACT019"],
    words: "jump, bump",
    target_sounds: "J, B, MP",
    notes: "Final cluster practice."
  },
  {
    rhyme_group_id: "nut_but_gut",
    rhyme_pattern: "-ut",
    word_ids: ["FOO009"],
    words: "nut",
    target_sounds: "N, T",
    notes: "Foundation. Add 'but', 'gut', 'hut', 'cut'."
  },
  {
    rhyme_group_id: "bag_tag",
    rhyme_pattern: "-ag",
    word_ids: ["OBJ023"],
    words: "bag",
    target_sounds: "B, G",
    notes: "Foundation. Add 'tag', 'wag'."
  },
  {
    rhyme_group_id: "mouse_house",
    rhyme_pattern: "-ouse",
    word_ids: ["ANI019"],
    words: "mouse",
    target_sounds: "M, S",
    notes: "Foundation. Add 'house'."
  },
  {
    rhyme_group_id: "beep_jeep",
    rhyme_pattern: "-eep",
    word_ids: ["VEH002"],
    words: "beep",
    target_sounds: "B, P",
    notes: "Foundation. Add 'jeep', 'deep', 'keep'."
  },
  {
    rhyme_group_id: "pie_bye",
    rhyme_pattern: "-ai (open)",
    word_ids: ["FOO005", "ACT004"],
    words: "pie, bye",
    target_sounds: "P, B",
    notes: "Open syllable rhyme."
  },
  {
    rhyme_group_id: "cow_bow_wow",
    rhyme_pattern: "-ow",
    word_ids: ["ANI015", "ACT008"],
    words: "cow, wow",
    target_sounds: "K, W",
    notes: "Fronting contrast for 'cow'."
  },
  {
    rhyme_group_id: "bread_bed_red",
    rhyme_pattern: "-ed (extended)",
    word_ids: ["FOO015", "OBJ001", "COL005"],
    words: "bread, bed, red",
    target_sounds: "BR, B, R, D",
    notes: "Shows cluster reduction: bread→bed."
  },
  {
    rhyme_group_id: "eat_meat",
    rhyme_pattern: "-eat",
    word_ids: ["ACT024", "FOO021"],
    words: "eat, meat",
    target_sounds: "T",
    notes: "Food pair."
  },
  {
    rhyme_group_id: "moon_spoon",
    rhyme_pattern: "-oon",
    word_ids: ["OBJ025", "OBJ018"],
    words: "moon, spoon",
    target_sounds: "M, SP, N",
    notes: "Bedtime pair. Could add 'soon'."
  },
  {
    rhyme_group_id: "nap_map",
    rhyme_pattern: "-ap",
    word_ids: ["OBJ008", "OBJ026"],
    words: "nap, map",
    target_sounds: "N, M, P",
    notes: "Both Tier 1 initials."
  },
  {
    rhyme_group_id: "bad_dad_had",
    rhyme_pattern: "-ad",
    word_ids: ["DES013", "PPL002", "FEE001", "FEE002"],
    words: "bad, dad, sad, mad",
    target_sounds: "B, D, S, M",
    notes: "Cross-tier rhyme: S is 24mo, others early."
  },
  {
    rhyme_group_id: "rain_train",
    rhyme_pattern: "-ain",
    word_ids: ["OBJ028", "VEH009"],
    words: "rain, train",
    target_sounds: "R, TR, N",
    notes: "Cluster contrast."
  },
  {
    rhyme_group_id: "shirt_skirt",
    rhyme_pattern: "-ɜːrt",
    word_ids: ["CLO001", "CLO015", "NAT017"],
    words: "shirt, skirt, dirt",
    target_sounds: "SH, SK, D, R, T",
    notes: "R-controlled vowel rhyme. All have late R.",
  },
  {
    rhyme_group_id: "rock_sock",
    rhyme_pattern: "-ock",
    word_ids: ["NAT003", "OBJ014"],
    words: "rock, sock",
    target_sounds: "R, S, K",
    notes: "CVC rhyme pair. R vs S initial contrast.",
  },
  {
    rhyme_group_id: "shell_bell",
    rhyme_pattern: "-ell",
    word_ids: ["NAT016"],
    words: "shell",
    target_sounds: "SH, L",
    notes: "Foundation. Add 'bell', 'well', 'tell'.",
  },
  {
    rhyme_group_id: "flower_shower",
    rhyme_pattern: "-ower",
    word_ids: ["NAT001", "FUR017"],
    words: "flower, shower",
    target_sounds: "FL, SH, R",
    notes: "Both have vocalic R. Late sounds.",
  },
]
