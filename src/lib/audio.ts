export function hasAudioSignal(samples: Float32Array) {
  return samples.some((sample) => Math.abs(sample) > 0.001);
}

export function audioOffsetFromPosition(position: number, width: number, durationMs: number) {
  if (width <= 0 || durationMs <= 0) return 0;
  return Math.round(Math.min(1, Math.max(0, position / width)) * durationMs);
}
