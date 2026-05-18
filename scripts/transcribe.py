#!/usr/bin/env python3
"""Transcribe a video file using faster-whisper.

Usage:
    python scripts/transcribe.py <video_path> [--model base] [--language id]

Output: JSON with segments, words, and silences.
"""

import argparse
import json
import sys
import os
from pathlib import Path


def extract_audio(video_path: str) -> str:
    """Extract audio from video to a temp wav file using ffmpeg."""
    import subprocess
    import tempfile

    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp.close()

    cmd = [
        "ffmpeg", "-y", "-i", video_path,
        "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        tmp.name,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr[-500:]}")

    return tmp.name


def detect_language(audio_path: str, model_size: str) -> str:
    """Use a short segment to detect language."""
    from faster_whisper import WhisperModel

    model = WhisperModel(model_size, device="cpu", compute_type="int8")

    # Transcribe first 30 seconds for language detection
    segments, info = model.transcribe(
        audio_path,
        beam_size=1,
        vad_filter=False,
        duration=max(30.0, 0),
    )

    # Consume generator to get language
    for _ in segments:
        pass

    return info.language


def transcribe(audio_path: str, model_size: str = "base", language: str | None = None) -> dict:
    """Run faster-whisper transcription and return structured output."""
    from faster_whisper import WhisperModel

    model = WhisperModel(model_size, device="cpu", compute_type="int8")

    segments_gen, info = model.transcribe(
        audio_path,
        beam_size=5,
        vad_filter=True,
        vad_parameters=dict(
            min_silence_duration_ms=500,
            speech_pad_ms=200,
        ),
        language=language,
        word_timestamps=True,
    )

    segments = []
    words = []
    silences = []
    prev_end = 0.0

    for seg in segments_gen:
        seg_words = []
        if seg.words:
            for w in seg.words:
                word_data = {
                    "word": w.word.strip(),
                    "start": round(w.start, 3),
                    "end": round(w.end, 3),
                    "probability": round(w.probability, 3),
                }
                words.append(word_data)
                seg_words.append(word_data)

        # Detect silence gap before this segment
        if segments and seg.start - prev_end > 0.3:
            silences.append({
                "start": round(prev_end, 3),
                "end": round(seg.start, 3),
                "duration": round(seg.start - prev_end, 3),
            })

        segments.append({
            "id": len(segments),
            "text": seg.text.strip(),
            "start": round(seg.start, 3),
            "end": round(seg.end, 3),
            "avg_logprob": round(seg.avg_logprob, 4),
            "no_speech_prob": round(seg.no_speech_prob, 4),
            "words": seg_words,
        })
        prev_end = seg.end

    return {
        "language": info.language,
        "language_probability": round(info.language_probability, 3),
        "duration": round(info.duration, 3),
        "segments": segments,
        "words": words,
        "silences": silences,
    }


def main():
    parser = argparse.ArgumentParser(description="Transcribe video with faster-whisper")
    parser.add_argument("video_path", help="Path to video file")
    parser.add_argument("--model", default="base", help="Whisper model size (tiny/base/small/medium/large)")
    parser.add_argument("--language", default=None, help="Language code (e.g., 'id', 'en')")
    args = parser.parse_args()

    video_path = Path(args.video_path)
    if not video_path.exists():
        print(json.dumps({"error": f"File not found: {video_path}"}))
        sys.exit(1)

    print(f"Extracting audio from {video_path.name}...", file=sys.stderr)
    audio_path = extract_audio(str(video_path))

    try:
        print(f"Using model: {args.model}", file=sys.stderr)
        result = transcribe(audio_path, model_size=args.model, language=args.language)
        result["source"] = str(video_path)
        result["model"] = args.model
        print(json.dumps(result, ensure_ascii=False, indent=2))
    finally:
        try:
            os.unlink(audio_path)
        except OSError:
            pass


if __name__ == "__main__":
    main()
