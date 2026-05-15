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
  }

  const ffmpeg: FfmpegFactory;

  export default ffmpeg;
}
