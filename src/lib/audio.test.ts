import { expect, test } from "bun:test";
import { audioOffsetFromPosition, audioRangeFromTranscriptSelection, hasAudioSignal } from "@/lib/audio";
import { apiOffset } from "@/lib/review";

test("distinguishes microphone input from digital silence", () => {
  expect(hasAudioSignal(new Float32Array([0, 0, 0]))).toBe(false);
  expect(hasAudioSignal(new Float32Array([0, 0.002, 0]))).toBe(true);
});

test("maps a dragged timeline position to recording milliseconds", () => {
  expect(audioOffsetFromPosition(-10, 100, 10_000)).toBe(0);
  expect(audioOffsetFromPosition(25, 100, 10_000)).toBe(2500);
  expect(audioOffsetFromPosition(150, 100, 10_000)).toBe(10_000);
});

test("maps selected transcript words to their complete audio interval", () => {
  const words = [
    { start: 2, end: 7, audioStartMs: 100, audioEndMs: 400 },
    { start: 8, end: 11, audioStartMs: 500, audioEndMs: 800 },
  ];
  const transcript = "👋 Aarav Sen!";
  expect(audioRangeFromTranscriptSelection({ start: apiOffset(transcript, 4), end: apiOffset(transcript, 11) }, words))
    .toEqual({ start: 2, end: 11, startMs: 100, endMs: 800 });
  expect(audioRangeFromTranscriptSelection({ start: 4, end: 5 }, words))
    .toEqual({ start: 2, end: 7, startMs: 100, endMs: 400 });
  expect(audioRangeFromTranscriptSelection({ start: 7, end: 8 }, words)).toBeNull();
  expect(audioRangeFromTranscriptSelection({ start: 11, end: 12 }, words)).toBeNull();
  expect(audioRangeFromTranscriptSelection({ start: 6, end: 7 }, [
    { start: 0, end: 18, audioStartMs: 400, audioEndMs: 1200 },
  ])).toEqual({ start: 0, end: 18, startMs: 400, endMs: 1200 });
});
