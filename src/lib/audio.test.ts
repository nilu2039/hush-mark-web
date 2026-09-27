import { expect, test } from "bun:test";
import { hasAudioSignal } from "@/lib/audio";

test("distinguishes microphone input from digital silence", () => {
  expect(hasAudioSignal(new Float32Array([0, 0, 0]))).toBe(false);
  expect(hasAudioSignal(new Float32Array([0, 0.002, 0]))).toBe(true);
});
