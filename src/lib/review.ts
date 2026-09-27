import type { ReviewStatus } from "@/schema/hushmark";

export function nextManualId(marks: { id: string }[]) {
  const used = new Set(marks.map(({ id }) => id));
  for (let number = 1; ; number++) {
    const id = `man_${number}`;
    if (!used.has(id)) return id;
  }
}

export function apiOffset(text: string, utf16Offset: number) {
  return Array.from(text.slice(0, utf16Offset)).length;
}

type Mark = { id: string; status: ReviewStatus };

function commonIssue(marks: Mark[]) {
  if (marks.some(({ status }) => status === "pending")) return "Review every mark before exporting.";
  const ids = marks.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) return "Review marks must have unique IDs.";
  const automatic = ids.filter((id) => id.startsWith("det_"));
  if (automatic.some((id, index) => !ids.includes(`det_${index + 1}`))) return "Automatic marks are incomplete.";
  return null;
}

export function textReviewIssue(
  marks: (Mark & { start: number; end: number })[],
  length: number,
) {
  const issue = commonIssue(marks);
  if (issue) return issue;
  if (marks.some(({ start, end }) => !Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= end || end > length)) {
    return "Each text range must fit within the original text and have a start before its end.";
  }
  const approved = marks.filter(({ status }) => status === "approved").sort((a, b) => a.start - b.start);
  if (approved.some((mark, index) => index > 0 && mark.start < approved[index - 1].end)) {
    return "Approved text ranges cannot overlap.";
  }
  return null;
}

export function audioReviewIssue(
  marks: (Mark & { audioStartMs: number; audioEndMs: number })[],
  durationMs?: number,
) {
  const issue = commonIssue(marks);
  if (issue) return issue;
  if (marks.some(({ audioStartMs, audioEndMs }) =>
    !Number.isInteger(audioStartMs) || !Number.isInteger(audioEndMs) ||
    audioStartMs < 0 || audioStartMs >= audioEndMs ||
    (durationMs !== undefined && audioEndMs > durationMs)
  )) return "Each audio interval must fit within the recording and have a start before its end.";
  return null;
}
