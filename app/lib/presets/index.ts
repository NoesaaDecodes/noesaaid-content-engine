export type ReelPreset = {
  id: string;
  name: string;
  description: string;
  defaultTopic: string;
  categories: string[];
  platforms: string[];
  tones: string[];
  systemPrompt: string;
  visualStyle: string;
  defaultHashtags: string[];
};

export const reelPresets = [
  {
    id: "needsport",
    name: "NeedSport",
    description: "Football, futsal, jersey marketing, and matchday content.",
    defaultTopic: "Jersey futsal custom untuk team kantor",
    categories: [
      "Jersey marketing",
      "Football story",
      "Futsal tips",
      "Matchday promo",
    ],
    platforms: ["TikTok", "Instagram Reels", "YouTube Shorts"],
    tones: ["Savage emotional", "Motivational", "Funny banter", "Premium brand"],
    systemPrompt:
      "Kamu adalah AI content strategist untuk niche football/futsal dan jersey marketing. Buat konten short-form video bahasa Indonesia yang savage, emotional, retention-driven, subtitle-friendly, dan copyright-safe. Jangan klaim afiliasi klub, pemain, atau brand yang tidak diberikan user. Output wajib JSON valid tanpa markdown.",
    visualStyle: "Dark sporty, high-contrast, energetic, matchday-ready.",
    defaultHashtags: ["#Futsal", "#Football", "#JerseyCustom", "#Matchday"],
  },
  {
    id: "generic-creator",
    name: "Generic Creator",
    description: "General short-form content for creators, brands, and products.",
    defaultTopic: "Produk baru yang perlu dijelaskan dalam video pendek",
    categories: ["Product explainer", "Personal brand", "Education", "Promo"],
    platforms: ["TikTok", "Instagram Reels", "YouTube Shorts"],
    tones: ["Clear", "Bold", "Friendly", "Premium"],
    systemPrompt:
      "Kamu adalah AI content strategist untuk short-form video lintas niche. Buat konten bahasa Indonesia yang jelas, menarik, retention-driven, subtitle-friendly, dan copyright-safe. Hindari klaim palsu atau referensi brand yang tidak diberikan user. Output wajib JSON valid tanpa markdown.",
    visualStyle: "Modern SaaS, clean contrast, creator-focused.",
    defaultHashtags: ["#Creator", "#ShortVideo", "#Reels", "#Content"],
  },
  {
    id: "motivation",
    name: "Motivation",
    description: "Mindset, discipline, productivity, and personal growth reels.",
    defaultTopic: "Disiplin kecil yang bikin hidup lebih rapi",
    categories: ["Discipline", "Mindset", "Productivity", "Self improvement"],
    platforms: ["TikTok", "Instagram Reels", "YouTube Shorts"],
    tones: ["Deep", "Direct", "Emotional", "Calm"],
    systemPrompt:
      "Kamu adalah AI writer untuk konten motivasi short-form bahasa Indonesia. Buat naskah yang emosional, practical, retention-driven, subtitle-friendly, dan copyright-safe. Hindari janji hasil berlebihan atau nasihat medis/finansial/legal. Output wajib JSON valid tanpa markdown.",
    visualStyle: "Minimal, cinematic dark, high readability.",
    defaultHashtags: ["#Motivation", "#Mindset", "#Discipline", "#SelfGrowth"],
  },
  {
    id: "crypto",
    name: "Crypto",
    description: "Crypto education, market concepts, and risk-aware explainers.",
    defaultTopic: "Cara memahami risiko sebelum membeli aset crypto",
    categories: ["Crypto education", "Market explainer", "Risk management", "News context"],
    platforms: ["TikTok", "Instagram Reels", "YouTube Shorts"],
    tones: ["Educational", "Cautious", "Direct", "Analytical"],
    systemPrompt:
      "Kamu adalah AI content strategist untuk edukasi crypto short-form bahasa Indonesia. Buat konten yang jelas, risk-aware, retention-driven, subtitle-friendly, dan copyright-safe. Jangan memberi nasihat investasi personal, jangan menjanjikan profit, dan selalu tekankan risiko bila relevan. Output wajib JSON valid tanpa markdown.",
    visualStyle: "Dark tech, data-forward, high contrast.",
    defaultHashtags: ["#Crypto", "#Blockchain", "#CryptoEducation", "#RiskManagement"],
  },
] satisfies ReelPreset[];

export type ReelPresetId = (typeof reelPresets)[number]["id"];

export const defaultPresetId: ReelPresetId = "needsport";

export function getPresetById(presetId: string | undefined) {
  return (
    reelPresets.find((preset) => preset.id === presetId) ||
    reelPresets.find((preset) => preset.id === defaultPresetId) ||
    reelPresets[0]
  );
}
