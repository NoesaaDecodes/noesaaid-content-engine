export type CuriosityHook = {
  openLoop: string;
  delayedPayoff: string;
  mysteryPhrase: string;
  tensionLine: string;
};

const CURIOSITY_PATTERNS: Record<string, CuriosityHook> = {
  id: {
    openLoop: "Dan yang bikin gue kaget adalah...",
    delayedPayoff: "Nanti di akhir video gue kasih tau rahasianya",
    mysteryPhrase: "Ada satu hal yang 99% orang gak tau soal ini",
    tensionLine: "Gue hampir kehilangan segalanya gara-gara ini",
  },
  en: {
    openLoop: "And what shocked me was...",
    delayedPayoff: "Stay till the end — I'll reveal the secret",
    mysteryPhrase: "There's one thing 99% of people don't know about this",
    tensionLine: "I almost lost everything because of this",
  },
};

export function getCuriosityPatterns(language: string): CuriosityHook {
  const lang = language === "id" ? "id" : "en";
  return CURIOSITY_PATTERNS[lang] || CURIOSITY_PATTERNS.en;
}
