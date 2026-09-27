import { expect, test } from "bun:test";
import { apiOffset, audioReviewIssue, nextManualId, selectionOffsets, textReviewIssue } from "@/lib/review";

test("manual IDs, Unicode offsets, and export range checks", () => {
  expect(nextManualId([{ id: "man_1" }, { id: "man_3" }])).toBe("man_2");
  expect(apiOffset("👋 hello", 3)).toBe(2);
  expect(selectionOffsets("👋 A\r\nB", "👋 ", "👋 A\r\nB")).toEqual({ start: 2, end: 6 });
  expect(selectionOffsets("👋 A\r\nB", "👋 ", "👋 A\nB")).toBeNull();
  const marks = [
    { id: "det_1", start: 0, end: 2, status: "approved" as const },
    { id: "man_1", start: 1, end: 3, status: "approved" as const },
  ];
  expect(textReviewIssue(marks, 3)).toMatch(/overlap/);
  expect(textReviewIssue([{ ...marks[1], status: "rejected" }], 3)).toBeNull();
  expect(audioReviewIssue([{ id: "det_1", status: "approved", audioStartMs: 0, audioEndMs: 2000 }], 1000)).toMatch(/recording/);
});
