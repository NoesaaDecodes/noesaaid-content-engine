export type TonePreset = {
  id: string;
  label: string;
  description: string;
  voiceStyle: string;
  examples: string[];
};

export const TONE_PRESETS: TonePreset[] = [
  {
    id: "hormozi",
    label: "Hormozi",
    description: "Direct, no fluff, business value",
    voiceStyle:
      "Direct and blunt. No fluff. Focus on value and results. Use bold claims backed by logic. Short punchy sentences. Business-savvy tone.",
    examples: [
      "This one change 3x'd my revenue",
      "Stop wasting time on things that don't work",
      "Here's the hard truth nobody tells you",
    ],
  },
  {
    id: "genz",
    label: "Gen Z",
    description: "Casual, slang, meme-aware",
    voiceStyle:
      "Casual and fun. Use slang like 'no cap', 'fr fr', 'bussin', 'slay'. Meme-aware. Keep it relatable and lowkey. Short sentences with attitude.",
    examples: [
      "No cap this changed my life fr fr",
      "POV: you finally figure out the secret",
      "This is bussin and nobody talks about it",
    ],
  },
  {
    id: "podcast",
    label: "Podcast",
    description: "Conversational, thoughtful",
    voiceStyle:
      "Conversational and thoughtful. Like talking to a friend. Longer flowing sentences. Personal anecdotes. Warm and engaging. Ask rhetorical questions.",
    examples: [
      "So I was thinking about this the other day",
      "You know what's interesting about this?",
      "Let me tell you something that blew my mind",
    ],
  },
  {
    id: "crypto",
    label: "Crypto",
    description: "Hype, FOMO, numbers-driven",
    voiceStyle:
      "High energy and hype. Use numbers and percentages. Create FOMO. References to moon, bear, bull, diamond hands. Urgency-driven. Bold predictions.",
    examples: [
      "This 100x gem is still under the radar",
      "Diamond hands win in the end",
      "The next bull run starts with this",
    ],
  },
  {
    id: "motivation",
    label: "Motivation",
    description: "Inspiring, action-oriented",
    voiceStyle:
      "Inspiring and empowering. Action-oriented language. Overcome obstacles narrative. Build urgency to act now. Use 'you can' and 'start today'. Emotional punch.",
    examples: [
      "Your future self will thank you for this",
      "Stop waiting for the perfect moment",
      "This is the sign you've been waiting for",
    ],
  },
  {
    id: "news",
    label: "News",
    description: "Factual, urgent, authoritative",
    voiceStyle:
      "Factual and authoritative. Breaking news style. Use data and sources. Urgent but measured. Journalistic tone. Lead with the most important info.",
    examples: [
      "Breaking: new study reveals this shocking finding",
      "Experts warn about this growing trend",
      "Here's what you need to know right now",
    ],
  },
  {
    id: "savage",
    label: "Savage",
    description: "Blunt, controversial, challenging",
    voiceStyle:
      "Blunt and unapologetic. Challenge the audience. Controversial takes. Pushback on common beliefs. No sugarcoating. Confident and bold.",
    examples: [
      "If you do this, you're part of the problem",
      "Unpopular opinion: you're doing it all wrong",
      "Time to hear what nobody has the guts to say",
    ],
  },
  {
    id: "documentary",
    label: "Documentary",
    description: "Storytelling, cinematic narration",
    voiceStyle:
      "Cinematic storytelling. Dramatic pauses implied. Paint vivid pictures. Build tension. Third-person or observational perspective. Epic and immersive.",
    examples: [
      "In the depths of an ordinary life, something extraordinary happened",
      "This is the story that changed everything",
      "What started as a simple experiment became something no one expected",
    ],
  },
  {
    id: "meme",
    label: "Meme",
    description: "Humor, relatable, trending",
    voiceStyle:
      "Funny and relatable. Use trending references and humor. Self-deprecating jokes. Absurd comparisons. Keep it light and shareable. Meme energy.",
    examples: [
      "Me thinking I'd be productive today",
      "Nobody: absolutely nobody: me at 3am",
      "This is the content you didn't know you needed",
    ],
  },
  {
    id: "educational",
    label: "Educational",
    description: "Clear, step-by-step, simple",
    voiceStyle:
      "Clear and structured. Step-by-step explanations. Break down complex ideas simply. Use analogies. Teach with examples. Informative but accessible.",
    examples: [
      "Here's how this works in 3 simple steps",
      "Most people get this wrong, here's why",
      "Let me break this down so it actually makes sense",
    ],
  },
];

export function getToneById(id: string): TonePreset | undefined {
  return TONE_PRESETS.find((t) => t.id === id);
}

export function getToneVoiceStyle(id: string): string {
  const tone = getToneById(id);
  return tone ? tone.voiceStyle : "";
}
