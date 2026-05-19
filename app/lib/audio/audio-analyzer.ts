import { execFile } from "node:child_process";

export type AudioAnalysis = {
  avgVolume: number;
  peakMoments: { time: number; level: number }[];
  silenceRegions: { start: number; end: number }[];
  energyProfile: number[];
  loudnessSpikes: { time: number; intensity: number }[];
};

export async function analyzeAudio(
  sourcePath: string,
  startTime: number,
  endTime: number
): Promise<AudioAnalysis> {
  const duration = endTime - startTime;
  if (duration <= 0) {
    return {
      avgVolume: 0,
      peakMoments: [],
      silenceRegions: [],
      energyProfile: [],
      loudnessSpikes: [],
    };
  }

  const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
  const args = [
    "-y",
    "-ss", startTime.toString(),
    "-t", duration.toString(),
    "-i", sourcePath,
    "-af", "astats=metadata=1:reset=1,ametadata=mode=print:key=lavfi.astats.Overall.RMS_level",
    "-f", "null",
    "-",
  ];

  return new Promise((resolve) => {
    execFile(
      ffmpegPath,
      args,
      { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 },
      (_error, _stdout, stderr) => {
        const output = stderr || "";
        const rmsValues: { time: number; level: number }[] = [];

        for (const line of output.split("\n")) {
          const timeMatch = line.match(/pts_time:(\d+\.?\d*)/);
          const rmsMatch = line.match(/lavfi\.astats\.Overall\.RMS_level=(-?\d+\.?\d*)/);

          if (timeMatch && rmsMatch) {
            rmsValues.push({
              time: parseFloat(timeMatch[1]),
              level: parseFloat(rmsMatch[1]),
            });
          }
        }

        if (rmsValues.length === 0) {
          resolve({
            avgVolume: 0,
            peakMoments: [],
            silenceRegions: [],
            energyProfile: [],
            loudnessSpikes: [],
          });
          return;
        }

        // Normalize RMS levels (typically -60 to 0 dB)
        const levels = rmsValues.map((v) => v.level);
        const minLevel = Math.min(...levels);
        const maxLevel = Math.max(...levels);
        const range = maxLevel - minLevel || 1;

        const normalizedLevels = levels.map(
          (l) => (l - minLevel) / range
        );

        // Average volume
        const avgVolume =
          normalizedLevels.reduce((s, v) => s + v, 0) / normalizedLevels.length;

        // Energy profile (volume per second, normalized 0-1)
        const energyProfile: number[] = [];
        const sampleDuration = duration / Math.max(1, Math.ceil(duration));
        for (let i = 0; i < Math.ceil(duration); i++) {
          const secStart = i * sampleDuration;
          const secEnd = (i + 1) * sampleDuration;
          const secValues = normalizedLevels.filter(
            (_, idx) =>
              rmsValues[idx].time >= startTime + secStart &&
              rmsValues[idx].time < startTime + secEnd
          );
          if (secValues.length > 0) {
            energyProfile.push(
              secValues.reduce((s, v) => s + v, 0) / secValues.length
            );
          } else {
            energyProfile.push(0);
          }
        }

        // Peak moments (top 5% or above 0.8)
        const peakThreshold = Math.max(0.8, avgVolume + 0.2);
        const peakMoments = rmsValues
          .filter((_, idx) => normalizedLevels[idx] >= peakThreshold)
          .map((v, idx) => ({
            time: v.time - startTime,
            level: normalizedLevels[idx],
          }))
          .slice(0, 10);

        // Silence regions (below 0.15 normalized)
        const silenceThreshold = 0.15;
        const silenceRegions: { start: number; end: number }[] = [];
        let silenceStart: number | null = null;

        for (let i = 0; i < rmsValues.length; i++) {
          if (normalizedLevels[i] < silenceThreshold) {
            if (silenceStart === null) {
              silenceStart = rmsValues[i].time - startTime;
            }
          } else {
            if (silenceStart !== null) {
              const silenceEnd = rmsValues[i].time - startTime;
              if (silenceEnd - silenceStart >= 0.5) {
                silenceRegions.push({ start: silenceStart, end: silenceEnd });
              }
              silenceStart = null;
            }
          }
        }
        if (silenceStart !== null) {
          silenceRegions.push({
            start: silenceStart,
            end: duration,
          });
        }

        // Loudness spikes (above avg + 1.5 * stddev)
        const mean = avgVolume;
        const variance =
          normalizedLevels.reduce((s, v) => s + (v - mean) ** 2, 0) /
          normalizedLevels.length;
        const stddev = Math.sqrt(variance);
        const spikeThreshold = mean + 1.5 * stddev;

        const loudnessSpikes = rmsValues
          .filter((_, idx) => normalizedLevels[idx] > spikeThreshold)
          .map((v) => ({
            time: v.time - startTime,
            intensity: normalizedLevels[rmsValues.indexOf(v)],
          }))
          .slice(0, 20);

        resolve({
          avgVolume,
          peakMoments,
          silenceRegions,
          energyProfile,
          loudnessSpikes,
        });
      }
    );
  });
}
