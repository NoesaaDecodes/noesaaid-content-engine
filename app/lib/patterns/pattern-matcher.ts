import {
  VIRAL_HOOKS,
  POWER_WORDS,
  type ViralHook,
  type PowerWord,
} from "./viral-patterns";

export function findSimilarHooks(
  transcript: string,
  niche?: string,
  language?: string
): ViralHook[] {
  const lowerTranscript = transcript.toLowerCase();
  const words = lowerTranscript.split(/\s+/).filter((w) => w.length > 2);

  if (words.length === 0) {
    return VIRAL_HOOKS.filter((h) => {
      const langMatch = !language || language === "auto" || h.language === language || h.language === "both";
      const nicheMatch = !niche || niche === "general" || h.niche.includes(niche);
      return langMatch && nicheMatch;
    })
      .sort((a, b) => b.virality - a.virality)
      .slice(0, 3);
  }

  const scored = VIRAL_HOOKS.map((hook) => {
    let score = 0;

    // Keyword overlap
    const hookLower = hook.text.toLowerCase();
    for (const word of words) {
      if (hookLower.includes(word)) {
        score += 3;
      }
    }

    // Niche match
    if (niche && niche !== "general" && hook.niche.includes(niche)) {
      score += 5;
    }

    // Language match
    if (language && language !== "auto") {
      if (hook.language === language) {
        score += 4;
      } else if (hook.language === "both") {
        score += 2;
      } else {
        score -= 5;
      }
    }

    // Virality weight
    score += hook.virality;

    return { hook, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.hook);
}

export function findPowerWords(
  text: string,
  language: string
): PowerWord[] {
  const lowerText = text.toLowerCase();
  const lang = language === "id" ? "id" : "en";

  return POWER_WORDS.filter((pw) => {
    // Match language
    if (pw.language !== lang) return false;

    // Only suggest words NOT already in the text
    if (lowerText.includes(pw.word.toLowerCase())) return false;

    return true;
  })
    .sort((a, b) => {
      // High impact first
      if (a.impact === "high" && b.impact !== "high") return -1;
      if (a.impact !== "high" && b.impact === "high") return 1;
      return 0;
    })
    .slice(0, 8);
}

export function getPowerWordsForPrompt(language: string): string {
  const lang = language === "id" ? "id" : "en";
  const words = POWER_WORDS.filter(
    (pw) => pw.language === lang && pw.impact === "high"
  )
    .map((pw) => pw.word)
    .slice(0, 15);

  return words.join(", ");
}
