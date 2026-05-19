export type CTAType = {
  id: string;
  label: string;
  template: string;
  platform: string[];
};

export const CTA_TYPES: CTAType[] = [
  {
    id: "save",
    label: "Save",
    template: "Simpan video ini biar gak lupa!",
    platform: ["reels", "tiktok", "shorts"],
  },
  {
    id: "comment",
    label: "Comment",
    template: "Komen X kalau kamu setuju",
    platform: ["reels", "tiktok", "shorts"],
  },
  {
    id: "follow",
    label: "Follow",
    template: "Follow buat konten lebih lanjut",
    platform: ["reels", "tiktok", "shorts"],
  },
  {
    id: "share",
    label: "Share",
    template: "Share ke temen yang butuh ini",
    platform: ["reels", "tiktok", "shorts"],
  },
  {
    id: "rage",
    label: "Rage",
    template: "Komen kalau kamu benci X",
    platform: ["reels", "tiktok"],
  },
  {
    id: "curiosity",
    label: "Curiosity",
    template: "Part 2 ada di bio",
    platform: ["reels", "tiktok", "shorts"],
  },
  {
    id: "soft",
    label: "Soft",
    template: "Like kalau bermanfaat",
    platform: ["reels", "tiktok", "shorts"],
  },
  {
    id: "aggressive",
    label: "Aggressive",
    template: "Subscribe atau nyesel selamanya",
    platform: ["shorts", "tiktok"],
  },
];

export function getCTAType(id: string): CTAType | undefined {
  return CTA_TYPES.find((c) => c.id === id);
}

export function getCTAsForPlatform(platform: string): CTAType[] {
  return CTA_TYPES.filter((c) => c.platform.includes(platform));
}
