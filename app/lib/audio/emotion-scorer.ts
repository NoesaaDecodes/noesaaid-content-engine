import type { AudioAnalysis } from "./audio-analyzer";

export type EmotionScore = {
  overallEnergy: number;
  hasLaughterPattern: boolean;
  hasEmphasisMoments: boolean;
  energyVariance: number;
  bestMoments: { time: number; score: number }[];
};

export function scoreEmotionalEnergy(
  audioAnalysis: AudioAnalysis
): EmotionScore {
  const { avgVolume, peakMoments, energyProfile, loudnessSpikes } =
    audioAnalysis;

  if (energyProfile.length === 0) {
    return {
      overallEnergy: 0,
      hasLaughterPattern: false,
      hasEmphasisMoments: false,
      energyVariance: 0,
      bestMoments: [],
    };
  }

  // Overall energy (0-100) based on avg volume and spike density
  const spikeDensity = loudnessSpikes.length / Math.max(1, energyProfile.length);
  const overallEnergy = Math.round(
    Math.min(100, avgVolume * 60 + spikeDensity * 40)
  );

  // Energy variance
  const mean = energyProfile.reduce((s, v) => s + v, 0) / energyProfile.length;
  const variance =
    energyProfile.reduce((s, v) => s + (v - mean) ** 2, 0) /
    energyProfile.length;
  const energyVariance = Math.round(variance * 1000) / 1000;

  // Laughter detection: multiple spikes within 2s window, each > 0.3 above avg
  const hasLaughterPattern = detectLaughter(loudnessSpikes, avgVolume);

  // Emphasis moments: any peak above 0.8 normalized
  const hasEmphasisMoments = peakMoments.length > 0;

  // Best moments: score each second by energy + proximity to spikes
  const bestMoments = scoreBestMoments(energyProfile, loudnessSpikes);

  return {
    overallEnergy,
    hasLaughterPattern,
    hasEmphasisMoments,
    energyVariance,
    bestMoments,
  };
}

function detectLaughter(
  loudnessSpikes: { time: number; intensity: number }[],
  avgVolume: number
): boolean {
  if (loudnessSpikes.length < 3) return false;

  const spikeThreshold = avgVolume + 0.3;
  const significantSpikes = loudnessSpikes.filter(
    (s) => s.intensity > spikeThreshold
  );

  if (significantSpikes.length < 3) return false;

  // Check for 3+ spikes within any 2-second window
  for (let i = 0; i <= significantSpikes.length - 3; i++) {
    const windowEnd = significantSpikes[i].time + 2;
    let count = 0;
    for (let j = i; j < significantSpikes.length; j++) {
      if (significantSpikes[j].time <= windowEnd) {
        count++;
      } else {
        break;
      }
    }
    if (count >= 3) return true;
  }

  return false;
}

function scoreBestMoments(
  energyProfile: number[],
  loudnessSpikes: { time: number; intensity: number }[]
): { time: number; score: number }[] {
  const moments: { time: number; score: number }[] = [];

  for (let i = 0; i < energyProfile.length; i++) {
    let score = energyProfile[i] * 50;

    // Bonus for proximity to loudness spikes
    const secStart = i;
    const secEnd = i + 1;
    const nearbySpikes = loudnessSpikes.filter(
      (s) => s.time >= secStart && s.time < secEnd
    );
    score += nearbySpikes.length * 10;

    // Bonus for energy jumps (contrast with neighbors)
    if (i > 0 && energyProfile[i] > energyProfile[i - 1] + 0.2) {
      score += 15;
    }
    if (
      i < energyProfile.length - 1 &&
      energyProfile[i] > energyProfile[i + 1] + 0.2
    ) {
      score += 10;
    }

    moments.push({ time: i, score: Math.round(Math.min(100, score)) });
  }

  // Return top 5 moments sorted by score
  return moments.sort((a, b) => b.score - a.score).slice(0, 5);
}
