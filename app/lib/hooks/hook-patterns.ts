export type HookType =
  | "contrarian"
  | "shock"
  | "fear"
  | "story"
  | "authority"
  | "curiosity"
  | "urgency"
  | "specific";

export type HookPattern = {
  type: HookType;
  label: string;
  template: string;
  examples: string[];
  keywords: string[];
};

export const HOOK_PATTERNS: HookPattern[] = [
  {
    type: "contrarian",
    label: "Contrarian",
    template: "Semua orang salah tentang [topic]",
    examples: [
      "Semua orang salah tentang X",
      "X itu bohong",
      "Stop doing X right now",
      "Everything you know about X is wrong",
      "X is a lie and here's why",
    ],
    keywords: [
      "salah", "bohong", "wrong", "lie", "stop", "never",
      "bukan", "palsu", "hoax", "mitos", "myth",
    ],
  },
  {
    type: "shock",
    label: "Shock",
    template: "Ini gila tapi beneran terjadi",
    examples: [
      "Ini gila tapi beneran terjadi",
      "Gak akan percaya ini",
      "This is insane",
      "I can't believe this happened",
      "Nobody talks about this",
    ],
    keywords: [
      "gila", "insane", "percaya", "believe", "nobody",
      "shocking", "unbelievable", "crazy", "beneran", "ternyata",
    ],
  },
  {
    type: "fear",
    label: "Fear",
    template: "Jangan lakukan X sebelum baca ini",
    examples: [
      "Jangan lakukan X sebelum baca ini",
      "X bisa rusakkan hidupmu",
      "Stop before you regret this",
      "This mistake will cost you",
      "Don't do X until you watch this",
    ],
    keywords: [
      "jangan", "don't", "stop", "rusak", "regret",
      "cost", "mistake", "bahaya", "danger", "warning",
      "hati-hati", "careful", "sebelum", "before",
    ],
  },
  {
    type: "story",
    label: "Story",
    template: "3 tahun lalu saya hampir X",
    examples: [
      "3 tahun lalu saya hampir X",
      "Ini yang mengubah segalanya",
      "The moment that changed everything",
      "I almost gave up until",
      "This story will change your mind",
    ],
    keywords: [
      "lalu", "ago", "hampir", "almost", "mengubah",
      "changed", "story", "kisah", "cerita", "moment",
      "awalnya", "dulu", "finally",
    ],
  },
  {
    type: "authority",
    label: "Authority",
    template: "Setelah X tahun, saya baru sadar",
    examples: [
      "Setelah X tahun, saya baru sadar",
      "Expert bilang ini",
      "After 10 years I finally understand",
      "Scientists just discovered",
      "The top 1% do this differently",
    ],
    keywords: [
      "tahun", "years", "expert", "scientist", "research",
      "study", "proof", "bukti", "top", "terbaik",
      "profesional", "professional", "master", "juara",
    ],
  },
  {
    type: "curiosity",
    label: "Curiosity",
    template: "Kenapa X padahal Y?",
    examples: [
      "Kenapa X padahal Y?",
      "Rahasia X yang gak diajarkan",
      "The secret behind X",
      "Why nobody talks about X",
      "What happens when you X",
    ],
    keywords: [
      "kenapa", "why", "rahasia", "secret", "bagaimana",
      "how", "what", "gak diajarkan", "never taught",
      "hidden", "tersembunyi", "tahukah", "did you know",
    ],
  },
  {
    type: "urgency",
    label: "Urgency",
    template: "Lakukan ini sekarang sebelum terlambat",
    examples: [
      "Lakukan ini sekarang sebelum terlambat",
      "X hari tersisa",
      "Do this now before it's too late",
      "This won't last long",
      "Last chance to X",
    ],
    keywords: [
      "sekarang", "now", "terlambat", "late", "hari",
      "days", "last", "chance", "segera", "immediately",
      "limited", "terbatas", "hurry", "cepat",
    ],
  },
  {
    type: "specific",
    label: "Specific",
    template: "7 hal yang X",
    examples: [
      "7 hal yang X",
      "Dalam 30 detik X",
      "In 30 seconds you'll X",
      "3 things that changed my X",
      "The exact step-by-step to X",
    ],
    keywords: [
      "hal", "things", "steps", "tips", "cara",
      "detik", "seconds", "menit", "minutes", "exact",
      "step-by-step", "panduan", "guide", "number",
    ],
  },
];

export function getHookPattern(type: HookType): HookPattern | undefined {
  return HOOK_PATTERNS.find((p) => p.type === type);
}

export const HOOK_TYPE_LABELS: Record<HookType, string> = Object.fromEntries(
  HOOK_PATTERNS.map((p) => [p.type, p.label])
) as Record<HookType, string>;
