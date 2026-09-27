import { describe, expect, test } from "bun:test";
import { redactText, textForDetection } from "@/lib/pii";

describe("PII text offsets", () => {
  test("uses Unicode code-point offsets and redacts approved spans", () => {
    const text = "👋 Email me@example.com";
    const detection = {
      id: "det_1",
      type: "EMAIL",
      start: 8,
      end: 22,
      confidence: 0.99,
      source: "regex",
      status: "pending" as const,
    };

    expect(textForDetection(text, detection.start, detection.end)).toBe("me@example.com");
    expect(redactText(text, [detection], { det_1: "approved" })).toBe("👋 Email [EMAIL]");
  });
});
