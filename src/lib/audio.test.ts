import { expect, test } from "bun:test";
import { audioOffsetFromPosition, hasAudioSignal } from "@/lib/audio";

test("distinguishes microphone input from digital silence", () => {
  expect(hasAudioSignal(new Float32Array([0, 0, 0]))).toBe(false);
  expect(hasAudioSignal(new Float32Array([0, 0.002, 0]))).toBe(true);
});

test("maps a dragged timeline position to recording milliseconds", () => {
  expect(audioOffsetFromPosition(-10, 100, 10_000)).toBe(0);
  expect(audioOffsetFromPosition(25, 100, 10_000)).toBe(2500);
  expect(audioOffsetFromPosition(150, 100, 10_000)).toBe(10_000);
});
