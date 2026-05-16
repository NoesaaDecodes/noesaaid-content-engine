declare module "fluent-ffmpeg" {
  type FfmpegCallback = (...args: unknown[]) => void;

  interface FfmpegCommand {
    input(source: string): FfmpegCommand;
    inputFormat(format: string): FfmpegCommand;
    inputOptions(options: string[]): FfmpegCommand;
    complexFilter(filters: string[]): FfmpegCommand;
    outputOptions(options: string[]): FfmpegCommand;
    on(event: "end" | "error", callback: FfmpegCallback): FfmpegCommand;
    save(output: string): FfmpegCommand;
    setFfmpegPath(path: string): FfmpegCommand;
  }

  interface FfmpegFactory {
    (): FfmpegCommand;
    setFfmpegPath(path: string): void;
    setFfprobePath(path: string): void;
    ffprobe(
      source: string,
      callback: (error: Error | null, metadata: FfprobeData) => void
    ): void;
  }

  interface FfprobeStream {
    codec_type?: string;
    width?: number;
    height?: number;
    duration?: number | string;
  }

  interface FfprobeFormat {
    duration?: number | string;
  }

  interface FfprobeData {
    format?: FfprobeFormat;
    streams?: FfprobeStream[];
  }

  const ffmpeg: FfmpegFactory;

  export default ffmpeg;
}
