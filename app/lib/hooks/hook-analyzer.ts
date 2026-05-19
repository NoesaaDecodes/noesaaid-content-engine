import { HOOK_PATTERNS, type HookType } from "./hook-patterns";

export type HookAnalysis = {
  score: number;
  type: HookType | "generic";
  weaknesses: string[];
  suggestions: string[];
};

const POWER_WORDS = [
  "rahasia", "secret", "gila", "insane", "terbukti", "proven",
  "gratis", "free", "instant", "cepat", "fast", "mudah", "easy",
  "hasil", "result", "terbaik", "best", "wajib", "must",
  "jangan", "don't", "sekarang", "now", "baru", "new",
];

const WEAK_STARTS = [
  /^hai\b/i,
  /^halo\b/i,
  /^hari ini\b/i,
  /^hi\b/i,
  /^hello\b/i,
  /^hey\b/i,
  /^ok\b/i,
  /^jadi\b/i,
  /^nah\b/i,
];

export function analyzeHookStrength(text: string): HookAnalysis {
  const trimmed = text.trim();
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  if (!trimmed) {
    return {
      score: 0,
      type: "generic",
      weaknesses: ["Hook is empty"],
      suggestions: ["Add an attention-grabbing opening line"],
    };
  }

  let score = 40; // base score

  // Word count check
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount > 15) {
    score -= 15;
    weaknesses.push("Too long (over 15 words)");
    suggestions.push("Shorten to 15 words or fewer");
  } else if (wordCount <= 8) {
    score += 10;
  }

  // Weak starts penalty
  for (const pattern of WEAK_STARTS) {
    if (pattern.test(trimmed)) {
      score -= 20;
      weaknesses.push("Weak opening (starts with greeting/filler)");
      suggestions.push("Start with a bold claim, question, or number");
      break;
    }
  }

  // Question mark bonus
  if (trimmed.includes("?")) {
    score += 10;
  }

  // Numbers/stats bonus
  if (/\d/.test(trimmed)) {
    score += 8;
  }

  // Exclamation bonus (mild)
  if (trimmed.includes("!")) {
    score += 3;
  }

  // Power words bonus
  const lowerText = trimmed.toLowerCase();
  const powerWordCount = POWER_WORDS.filter((w) => lowerText.includes(w)).length;
  score += Math.min(powerWordCount * 5, 15);

  // Check against known hook patterns
  let matchedType: HookType | "generic" = "generic";
  let bestMatchScore = 0;

  for (const pattern of HOOK_PATTERNS) {
    const keywordHits = pattern.keywords.filter((kw) =>
      lowerText.includes(kw.toLowerCase())
    ).length;

    if (keywordHits > bestMatchScore) {
      bestMatchScore = keywordHits;
      matchedType = pattern.type;
    }
  }

  if (bestMatchScore >= 2) {
    score += 15;
  } else if (bestMatchScore >= 1) {
    score += 5;
  }

  // Specific pattern bonuses
  if (matchedType === "curiosity" && trimmed.includes("?")) {
    score += 5;
  }
  if (matchedType === "specific" && /\d/.test(trimmed)) {
    score += 5;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Generate suggestions based on weaknesses
  if (!trimmed.includes("?") && !trimmed.includes("!")) {
    suggestions.push("Add a question or exclamation for more impact");
  }
  if (powerWordCount === 0) {
    suggestions.push("Use power words like 'rahasia', 'terbukti', 'wajib'");
  }
  if (bestMatchScore === 0) {
    suggestions.push("Try a proven hook pattern: question, number, or bold claim");
  }

  return {
    score,
    type: matchedType,
    weaknesses,
    suggestions: suggestions.slice(0, 3),
  };
}
