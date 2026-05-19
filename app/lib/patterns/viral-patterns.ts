import type { HookType } from "@/app/lib/hooks/hook-patterns";

export type ViralHook = {
  id: string;
  text: string;
  type: HookType;
  niche: string[];
  language: "id" | "en" | "both";
  virality: number;
};

export type ViralCaption = {
  id: string;
  text: string;
  platform: string[];
  niche: string[];
  language: "id" | "en" | "both";
  virality: number;
};

export type PowerWord = {
  word: string;
  language: "id" | "en";
  impact: "high" | "medium";
  category: "urgency" | "curiosity" | "social_proof" | "fear" | "excitement";
};

export const VIRAL_HOOKS: ViralHook[] = [
  // Indonesian hooks
  { id: "id-01", text: "95% orang Indonesia salah tentang ini", type: "contrarian", niche: ["general", "education"], language: "id", virality: 9 },
  { id: "id-02", text: "Gak ada yang kasih tau kamu soal ini", type: "curiosity", niche: ["general", "lifestyle"], language: "id", virality: 8 },
  { id: "id-03", text: "Ini yang bikin hidupku berubah 180 derajat", type: "story", niche: ["motivation", "lifestyle"], language: "id", virality: 9 },
  { id: "id-04", text: "Stop melakukan ini sekarang juga", type: "fear", niche: ["general", "health"], language: "id", virality: 7 },
  { id: "id-05", text: "Cara ini yang gak diajarkan di sekolah", type: "curiosity", niche: ["education", "general"], language: "id", virality: 8 },
  { id: "id-06", text: "Rahasia yang disembunyikan orang sukses", type: "curiosity", niche: ["motivation", "business"], language: "id", virality: 8 },
  { id: "id-07", text: "Jangan scroll dulu sebelum nonton ini", type: "urgency", niche: ["general"], language: "id", virality: 7 },
  { id: "id-08", text: "Ini alasan kenapa kamu gagal terus", type: "contrarian", niche: ["motivation", "business"], language: "id", virality: 8 },
  { id: "id-09", text: "3 detik yang mengubah segalanya buatku", type: "story", niche: ["motivation", "lifestyle"], language: "id", virality: 7 },
  { id: "id-10", text: "Kamu bakal nyesel gak nonton ini dari awal", type: "urgency", niche: ["general", "entertainment"], language: "id", virality: 8 },
  { id: "id-11", text: "Ini bukti kalau semua orang bisa sukses", type: "authority", niche: ["motivation", "business"], language: "id", virality: 7 },
  { id: "id-12", text: "Gak nyangka hasilnya kayak gini", type: "shock", niche: ["general", "entertainment"], language: "id", virality: 8 },
  { id: "id-13", text: "Lakukan ini setiap hari hidupmu berubah", type: "specific", niche: ["motivation", "health"], language: "id", virality: 7 },
  { id: "id-14", text: "Ini yang bikin orang biasa jadi luar biasa", type: "story", niche: ["motivation", "business"], language: "id", virality: 8 },
  { id: "id-15", text: "Coba tebak apa yang terjadi selanjutnya", type: "curiosity", niche: ["entertainment", "general"], language: "id", virality: 7 },
  { id: "id-16", text: "Satu kebiasaan ini mengubah karirku", type: "story", niche: ["business", "motivation"], language: "id", virality: 7 },
  { id: "id-17", text: "Ini dia trik yang dipakai content creator top", type: "authority", niche: ["business", "lifestyle"], language: "id", virality: 8 },
  { id: "id-18", text: "Jangan pernah lakukan ini di media sosial", type: "fear", niche: ["business", "lifestyle"], language: "id", virality: 7 },
  { id: "id-19", text: "Hasilnya gila dalam 30 hari aja", type: "specific", niche: ["motivation", "health"], language: "id", virality: 8 },
  { id: "id-20", text: "Ini rahasia yang gak pernah dibahas influencer", type: "curiosity", niche: ["business", "lifestyle"], language: "id", virality: 8 },
  { id: "id-21", text: "Aku hampir berhenti sebelum nemu ini", type: "story", niche: ["motivation", "business"], language: "id", virality: 7 },
  { id: "id-22", text: "Fakta ini bakal bikin kamu mikir ulang", type: "contrarian", niche: ["general", "education"], language: "id", virality: 7 },
  { id: "id-23", text: "Mulai sekarang lakukan 3 hal ini", type: "specific", niche: ["motivation", "health"], language: "id", virality: 7 },
  { id: "id-24", text: "Ini kesalahan terbesar yang pernah aku buat", type: "story", niche: ["motivation", "business"], language: "id", virality: 7 },
  { id: "id-25", text: "Kamu gak butuh bakat buat ini", type: "contrarian", niche: ["motivation", "education"], language: "id", virality: 8 },

  // English hooks
  { id: "en-01", text: "Nobody talks about this and it's driving me crazy", type: "curiosity", niche: ["general", "lifestyle"], language: "en", virality: 9 },
  { id: "en-02", text: "This changed everything for me overnight", type: "story", niche: ["motivation", "lifestyle"], language: "en", virality: 9 },
  { id: "en-03", text: "Stop doing X immediately if you want results", type: "fear", niche: ["general", "health"], language: "en", virality: 8 },
  { id: "en-04", text: "The truth about X they don't want you to know", type: "curiosity", niche: ["general", "education"], language: "en", virality: 9 },
  { id: "en-05", text: "I wish someone told me this 10 years ago", type: "story", niche: ["motivation", "business"], language: "en", virality: 9 },
  { id: "en-06", text: "This one habit made me $10k in 30 days", type: "specific", niche: ["business", "motivation"], language: "en", virality: 9 },
  { id: "en-07", text: "Watch this before it gets taken down", type: "urgency", niche: ["general", "entertainment"], language: "en", virality: 8 },
  { id: "en-08", text: "I tested this for 90 days and the results shocked me", type: "shock", niche: ["health", "lifestyle"], language: "en", virality: 9 },
  { id: "en-09", text: "The secret that top 1% won't share", type: "curiosity", niche: ["business", "motivation"], language: "en", virality: 8 },
  { id: "en-10", text: "This is why you're still broke", type: "contrarian", niche: ["business", "motivation"], language: "en", virality: 9 },
  { id: "en-11", text: "I almost gave up until I discovered this", type: "story", niche: ["motivation", "lifestyle"], language: "en", virality: 8 },
  { id: "en-12", text: "3 things I'd tell my 20-year-old self", type: "specific", niche: ["motivation", "lifestyle"], language: "en", virality: 8 },
  { id: "en-13", text: "This mistake cost me everything", type: "story", niche: ["business", "motivation"], language: "en", virality: 8 },
  { id: "en-14", text: "Do this every morning and watch what happens", type: "specific", niche: ["health", "motivation"], language: "en", virality: 8 },
  { id: "en-15", text: "The algorithm doesn't want you to see this", type: "curiosity", niche: ["general", "business"], language: "en", virality: 9 },
  { id: "en-16", text: "I spent $1000 to learn this so you don't have to", type: "authority", niche: ["business", "education"], language: "en", virality: 8 },
  { id: "en-17", text: "This is the only video you need to watch today", type: "urgency", niche: ["general", "education"], language: "en", virality: 7 },
  { id: "en-18", text: "POV: you finally understand the secret", type: "curiosity", niche: ["general", "lifestyle"], language: "en", virality: 8 },
  { id: "en-19", text: "Unpopular opinion: most advice is terrible", type: "contrarian", niche: ["motivation", "general"], language: "en", virality: 8 },
  { id: "en-20", text: "Here's what happens when you stop overthinking", type: "story", niche: ["motivation", "lifestyle"], language: "en", virality: 8 },
  { id: "en-21", text: "The real reason you're not growing", type: "contrarian", niche: ["business", "motivation"], language: "en", virality: 8 },
  { id: "en-22", text: "I did this for 6 months and became unrecognizable", type: "story", niche: ["health", "motivation"], language: "en", virality: 9 },
  { id: "en-23", text: "This is the easiest money you'll ever make", type: "specific", niche: ["business", "crypto"], language: "en", virality: 8 },
  { id: "en-24", text: "Scientists just discovered something terrifying", type: "shock", niche: ["general", "education"], language: "en", virality: 8 },
  { id: "en-25", text: "You're one decision away from a completely different life", type: "story", niche: ["motivation", "lifestyle"], language: "en", virality: 9 },
];

export const VIRAL_CAPTIONS: ViralCaption[] = [
  { id: "cap-01", text: "Save ini biar gak lupa. Kamu bakal butuh nanti.", platform: ["reels", "tiktok"], niche: ["general"], language: "id", virality: 8 },
  { id: "cap-02", text: "Tag temen yang butuh tau ini sekarang!", platform: ["reels", "tiktok"], niche: ["general"], language: "id", virality: 7 },
  { id: "cap-03", text: "Ini baru permulaan. Follow buat part 2.", platform: ["reels", "tiktok"], niche: ["general"], language: "id", virality: 8 },
  { id: "cap-04", text: "Coba komen kalau kamu pernah ngalamin ini juga.", platform: ["reels", "tiktok"], niche: ["lifestyle"], language: "id", virality: 7 },
  { id: "cap-05", text: "Share ke 5 temen yang perlu tau rahasia ini.", platform: ["reels", "tiktok"], niche: ["general"], language: "id", virality: 7 },
  { id: "cap-06", text: "Yang setuju, raise your hand!", platform: ["reels", "tiktok"], niche: ["general"], language: "id", virality: 7 },
  { id: "cap-07", text: "Part 2 kalau tembus 10k likes.", platform: ["reels", "tiktok"], niche: ["entertainment"], language: "id", virality: 8 },
  { id: "cap-08", text: "Aku share ini karena gak ada yang bahas.", platform: ["reels", "tiktok"], niche: ["education"], language: "id", virality: 7 },
  { id: "cap-09", text: "Ini konten yang kamu cari-cari selama ini.", platform: ["reels", "tiktok"], niche: ["general"], language: "id", virality: 7 },
  { id: "cap-10", text: "Jangan lupa save dan share ya!", platform: ["reels", "tiktok"], niche: ["general"], language: "id", virality: 6 },
  { id: "cap-11", text: "This is the content you didn't know you needed. Save it.", platform: ["reels", "tiktok", "shorts"], niche: ["general"], language: "en", virality: 8 },
  { id: "cap-12", text: "Tag someone who needs to see this today.", platform: ["reels", "tiktok", "shorts"], niche: ["general"], language: "en", virality: 8 },
  { id: "cap-13", text: "Follow for more content like this. Part 2 coming soon.", platform: ["reels", "tiktok", "shorts"], niche: ["general"], language: "en", virality: 7 },
  { id: "cap-14", text: "Comment 'YES' if you agree with this.", platform: ["reels", "tiktok"], niche: ["general"], language: "en", virality: 8 },
  { id: "cap-15", text: "Share this with someone who needs to hear it.", platform: ["reels", "tiktok", "shorts"], niche: ["motivation"], language: "en", virality: 8 },
  { id: "cap-16", text: "The algorithm brought you here for a reason. Don't scroll past.", platform: ["reels", "tiktok"], niche: ["general"], language: "en", virality: 9 },
  { id: "cap-17", text: "Save this before it gets taken down.", platform: ["reels", "tiktok"], niche: ["general"], language: "en", virality: 8 },
  { id: "cap-18", text: "Part 2 drops at 50k saves. Let's make it happen.", platform: ["reels", "tiktok"], niche: ["entertainment"], language: "en", virality: 8 },
  { id: "cap-19", text: "I wish I knew this sooner. Save it for later.", platform: ["reels", "tiktok", "shorts"], niche: ["motivation"], language: "en", virality: 8 },
  { id: "cap-20", text: "Double tap if this blew your mind.", platform: ["reels", "tiktok"], niche: ["general"], language: "en", virality: 7 },
  { id: "cap-21", text: "Ini hasil dari 1 tahun konsisten. Mau tau caranya?", platform: ["reels", "tiktok"], niche: ["motivation", "business"], language: "id", virality: 8 },
  { id: "cap-22", text: "Gak ada shortcut, tapi cara ini bisa percepat prosesnya.", platform: ["reels", "tiktok"], niche: ["motivation", "business"], language: "id", virality: 7 },
  { id: "cap-23", text: "Drop a follow kalau mau liat hasilnya.", platform: ["reels", "tiktok"], niche: ["general"], language: "id", virality: 7 },
  { id: "cap-24", text: "This changed my entire perspective. What do you think?", platform: ["reels", "tiktok", "shorts"], niche: ["motivation"], language: "en", virality: 7 },
  { id: "cap-25", text: "Bookmark this. You'll thank me later.", platform: ["reels", "tiktok", "shorts"], niche: ["general"], language: "en", virality: 8 },
  { id: "cap-26", text: "Masih banyak yang gak tau soal ini. Share biar mereka tau.", platform: ["reels", "tiktok"], niche: ["education"], language: "id", virality: 7 },
  { id: "cap-27", text: "Save, share, repeat. That's how we grow together.", platform: ["reels", "tiktok", "shorts"], niche: ["general"], language: "en", virality: 7 },
  { id: "cap-28", text: "Komen 'AKU' kalau pernah ngalamin hal yang sama.", platform: ["reels", "tiktok"], niche: ["lifestyle"], language: "id", virality: 7 },
  { id: "cap-29", text: "This is your sign to start today. No more excuses.", platform: ["reels", "tiktok", "shorts"], niche: ["motivation"], language: "en", virality: 9 },
  { id: "cap-30", text: "Follow untuk konten berkualitas setiap hari.", platform: ["reels", "tiktok"], niche: ["general"], language: "id", virality: 6 },
];

export const POWER_WORDS: PowerWord[] = [
  // Indonesian - Urgency
  { word: "sekarang", language: "id", impact: "high", category: "urgency" },
  { word: "cepat", language: "id", impact: "high", category: "urgency" },
  { word: "terakhir", language: "id", impact: "high", category: "urgency" },
  { word: "jangan", language: "id", impact: "high", category: "urgency" },
  { word: "sebelum", language: "id", impact: "medium", category: "urgency" },
  { word: "langsung", language: "id", impact: "medium", category: "urgency" },
  { word: "buruan", language: "id", impact: "high", category: "urgency" },
  { word: "terbatas", language: "id", impact: "medium", category: "urgency" },
  { word: "hari ini", language: "id", impact: "medium", category: "urgency" },
  { word: "mumpung", language: "id", impact: "high", category: "urgency" },

  // Indonesian - Curiosity
  { word: "rahasia", language: "id", impact: "high", category: "curiosity" },
  { word: "ternyata", language: "id", impact: "high", category: "curiosity" },
  { word: "gak nyangka", language: "id", impact: "high", category: "curiosity" },
  { word: "fakta", language: "id", impact: "medium", category: "curiosity" },
  { word: "misteri", language: "id", impact: "medium", category: "curiosity" },
  { word: "kenapa", language: "id", impact: "medium", category: "curiosity" },
  { word: "bagaimana", language: "id", impact: "medium", category: "curiosity" },
  { word: "alasan", language: "id", impact: "medium", category: "curiosity" },
  { word: "trik", language: "id", impact: "high", category: "curiosity" },
  { word: "cara", language: "id", impact: "medium", category: "curiosity" },

  // Indonesian - Social Proof
  { word: "semua orang", language: "id", impact: "high", category: "social_proof" },
  { word: "jutaan", language: "id", impact: "high", category: "social_proof" },
  { word: "terbukti", language: "id", impact: "high", category: "social_proof" },
  { word: "viral", language: "id", impact: "high", category: "social_proof" },
  { word: "trending", language: "id", impact: "medium", category: "social_proof" },
  { word: "populer", language: "id", impact: "medium", category: "social_proof" },
  { word: "expert", language: "id", impact: "medium", category: "social_proof" },
  { word: "profesional", language: "id", impact: "medium", category: "social_proof" },
  { word: "juara", language: "id", impact: "medium", category: "social_proof" },
  { word: "top", language: "id", impact: "medium", category: "social_proof" },

  // Indonesian - Fear
  { word: "bahaya", language: "id", impact: "high", category: "fear" },
  { word: "hati-hati", language: "id", impact: "high", category: "fear" },
  { word: "rusak", language: "id", impact: "high", category: "fear" },
  { word: "gagal", language: "id", impact: "high", category: "fear" },
  { word: "kalah", language: "id", impact: "medium", category: "fear" },
  { word: "rugi", language: "id", impact: "high", category: "fear" },
  { word: "salah", language: "id", impact: "medium", category: "fear" },
  { word: "ancaman", language: "id", impact: "medium", category: "fear" },
  { word: "masalah", language: "id", impact: "medium", category: "fear" },
  { word: "bencana", language: "id", impact: "high", category: "fear" },

  // Indonesian - Excitement
  { word: "gila", language: "id", impact: "high", category: "excitement" },
  { word: "luar biasa", language: "id", impact: "high", category: "excitement" },
  { word: "gratis", language: "id", impact: "high", category: "excitement" },
  { word: "hasilnya", language: "id", impact: "medium", category: "excitement" },
  { word: "berubah", language: "id", impact: "high", category: "excitement" },
  { word: "sukses", language: "id", impact: "high", category: "excitement" },
  { word: "hebat", language: "id", impact: "medium", category: "excitement" },
  { word: "wajib", language: "id", impact: "high", category: "excitement" },
  { word: "pasti", language: "id", impact: "medium", category: "excitement" },
  { word: "dijamin", language: "id", impact: "high", category: "excitement" },

  // English - Urgency
  { word: "now", language: "en", impact: "high", category: "urgency" },
  { word: "immediately", language: "en", impact: "high", category: "urgency" },
  { word: "before it's too late", language: "en", impact: "high", category: "urgency" },
  { word: "last chance", language: "en", impact: "high", category: "urgency" },
  { word: "don't wait", language: "en", impact: "high", category: "urgency" },
  { word: "hurry", language: "en", impact: "medium", category: "urgency" },
  { word: "limited", language: "en", impact: "medium", category: "urgency" },
  { word: "today", language: "en", impact: "medium", category: "urgency" },
  { word: "stop", language: "en", impact: "high", category: "urgency" },
  { word: "act now", language: "en", impact: "high", category: "urgency" },

  // English - Curiosity
  { word: "secret", language: "en", impact: "high", category: "curiosity" },
  { word: "hidden", language: "en", impact: "high", category: "curiosity" },
  { word: "truth", language: "en", impact: "high", category: "curiosity" },
  { word: "discover", language: "en", impact: "medium", category: "curiosity" },
  { word: "reveal", language: "en", impact: "high", category: "curiosity" },
  { word: "mystery", language: "en", impact: "medium", category: "curiosity" },
  { word: "why", language: "en", impact: "medium", category: "curiosity" },
  { word: "how", language: "en", impact: "medium", category: "curiosity" },
  { word: "shocking", language: "en", impact: "high", category: "curiosity" },
  { word: "unbelievable", language: "en", impact: "high", category: "curiosity" },

  // English - Social Proof
  { word: "everyone", language: "en", impact: "high", category: "social_proof" },
  { word: "millions", language: "en", impact: "high", category: "social_proof" },
  { word: "proven", language: "en", impact: "high", category: "social_proof" },
  { word: "viral", language: "en", impact: "high", category: "social_proof" },
  { word: "trending", language: "en", impact: "medium", category: "social_proof" },
  { word: "popular", language: "en", impact: "medium", category: "social_proof" },
  { word: "expert", language: "en", impact: "medium", category: "social_proof" },
  { word: "top", language: "en", impact: "medium", category: "social_proof" },
  { word: "best", language: "en", impact: "medium", category: "social_proof" },
  { word: "number one", language: "en", impact: "high", category: "social_proof" },

  // English - Fear
  { word: "danger", language: "en", impact: "high", category: "fear" },
  { word: "warning", language: "en", impact: "high", category: "fear" },
  { word: "destroy", language: "en", impact: "high", category: "fear" },
  { word: "fail", language: "en", impact: "high", category: "fear" },
  { word: "lose", language: "en", impact: "high", category: "fear" },
  { word: "mistake", language: "en", impact: "medium", category: "fear" },
  { word: "risk", language: "en", impact: "medium", category: "fear" },
  { word: "threat", language: "en", impact: "medium", category: "fear" },
  { word: "problem", language: "en", impact: "medium", category: "fear" },
  { word: "regret", language: "en", impact: "high", category: "fear" },

  // English - Excitement
  { word: "insane", language: "en", impact: "high", category: "excitement" },
  { word: "incredible", language: "en", impact: "high", category: "excitement" },
  { word: "free", language: "en", impact: "high", category: "excitement" },
  { word: "results", language: "en", impact: "medium", category: "excitement" },
  { word: "transform", language: "en", impact: "high", category: "excitement" },
  { word: "success", language: "en", impact: "high", category: "excitement" },
  { word: "amazing", language: "en", impact: "medium", category: "excitement" },
  { word: "must", language: "en", impact: "high", category: "excitement" },
  { word: "guaranteed", language: "en", impact: "high", category: "excitement" },
  { word: "powerful", language: "en", impact: "medium", category: "excitement" },
];
