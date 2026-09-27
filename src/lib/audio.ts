import type { AudioWordTiming } from "@/schema/hushmark";

export function hasAudioSignal(samples: Float32Array) {
  return samples.some((sample) => Math.abs(sample) > 0.001);
}

export function audioOffsetFromPosition(position: number, width: number, durationMs: number) {
  if (width <= 0 || durationMs <= 0) return 0;
  return Math.round(Math.min(1, Math.max(0, position / width)) * durationMs);
}

export function audioRangeFromTranscriptSelection(
  selection: { start: number; end: number },
  words: AudioWordTiming[],
) {
  if (selection.start >= selection.end) return null;
  const matching = words.filter((word) => word.start < selection.end && selection.start < word.end);
  if (!matching.length) return null;
  const first = matching[0];
  const last = matching[matching.length - 1];
  return { start: first.start, end: last.end, startMs: first.audioStartMs, endMs: last.audioEndMs };
}
