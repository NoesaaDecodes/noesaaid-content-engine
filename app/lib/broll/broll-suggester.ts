export type BRollSuggestion = {
  timestamp: number;
  keyword: string;
  suggestion: string;
  searchQuery: string;
  type: "stock" | "meme" | "image" | "graphic";
};

const KEYWORD_MAP: Array<{
  keywords: string[];
  suggestion: string;
  searchQuery: string;
  type: BRollSuggestion["type"];
}> = [
  { keywords: ["bitcoin", "crypto", "blockchain"], suggestion: "Stock chart animation", searchQuery: "bitcoin chart animation", type: "stock" },
  { keywords: ["workout", "gym", "exercise", "fitness"], suggestion: "Gym footage", searchQuery: "gym workout", type: "stock" },
  { keywords: ["coding", "programming", "developer", "code"], suggestion: "Typing on keyboard", searchQuery: "coding keyboard", type: "stock" },
  { keywords: ["money", "cash", "profit", "income", "revenue"], suggestion: "Cash/coins animation", searchQuery: "money cash", type: "stock" },
  { keywords: ["food", "cooking", "recipe", "meal"], suggestion: "Cooking footage", searchQuery: "cooking food", type: "stock" },
  { keywords: ["travel", "vacation", "beach", "mountain"], suggestion: "Travel scenery", searchQuery: "travel scenery", type: "stock" },
  { keywords: ["phone", "app", "social media", "tiktok"], suggestion: "Phone screen recording", searchQuery: "phone social media", type: "stock" },
  { keywords: ["success", "win", "achievement", "goal"], suggestion: "Celebration footage", searchQuery: "success celebration", type: "stock" },
  { keywords: ["fail", "mistake", "error", "wrong"], suggestion: "Fail compilation style", searchQuery: "funny fail", type: "meme" },
  { keywords: ["shock", "surprise", "unexpected"], suggestion: "Reaction meme", searchQuery: "shocked reaction", type: "meme" },
  { keywords: ["data", "statistics", "graph", "chart"], suggestion: "Animated infographic", searchQuery: "data visualization", type: "graphic" },
  { keywords: ["nature", "environment", "green"], suggestion: "Nature b-roll", searchQuery: "nature scenery", type: "stock" },
];

export function suggestBRoll(
  segments: Array<{ text: string; start: number; end: number }>
): BRollSuggestion[] {
  const suggestions: BRollSuggestion[] = [];

  for (const seg of segments) {
    const lower = seg.text.toLowerCase();

    for (const mapping of KEYWORD_MAP) {
      const match = mapping.keywords.find((kw) => lower.includes(kw));
      if (match) {
        suggestions.push({
          timestamp: seg.start,
          keyword: match,
          suggestion: mapping.suggestion,
          searchQuery: mapping.searchQuery,
          type: mapping.type,
        });
        break;
      }
    }
  }

  return suggestions;
}
