import type { Detection, ReviewStatus } from "@/schema/hushmark";

export function textForDetection(text: string, start: number, end: number) {
  return Array.from(text).slice(start, end).join("");
}

export function redactText(
  text: string,
  detections: Detection[],
  decisions: Record<string, ReviewStatus>,
) {
  const codePoints = Array.from(text);
  for (const detection of detections.toReversed()) {
    if (decisions[detection.id] === "approved") {
      codePoints.splice(detection.start, detection.end - detection.start, `[${detection.type}]`);
    }
  }
  return codePoints.join("");
}

export function formatEntityType(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
