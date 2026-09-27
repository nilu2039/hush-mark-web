export function hasAudioSignal(samples: Float32Array) {
  return samples.some((sample) => Math.abs(sample) > 0.001);
}
