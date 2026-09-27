import { expect, test } from "bun:test";
import { api } from "@/lib/api";
import { analyzeDocument, analyzeText, redactDocument } from "@/lib/api-requests";
import { documentAnalysisResponseSchema } from "@/schema/hushmark";

test("document review preserves Unicode spans, original file, and detection order", async () => {
  const file = new File(["👋 Email me@example.com\r\n"], "notes.md", { type: "text/markdown" });
  const text = "👋 Email me@example.com\r\n";
  const analysis = {
    analysisId: "ana_1",
    text,
    textLength: Array.from(text).length,
    detections: [
      { id: "det_2", type: "EMAIL", start: 8, end: 22, confidence: 0.99, source: "regex", status: "pending" },
      { id: "det_1", type: "OTHER", start: 0, end: 1, confidence: 0.6, source: "model", status: "pending" },
    ],
  };
  const previousAdapter = api.defaults.adapter;
  const calls: { url?: string; body?: FormData }[] = [];
  api.defaults.adapter = async (config) => {
    calls.push({ url: config.url, body: config.data as FormData });
    return { data: config.url === "/analyze/document" ? analysis : new Blob(["redacted"]), status: 200, statusText: "OK", headers: {}, config };
  };

  try {
    await expect(analyzeText({ text: "" })).rejects.toThrow();
    await expect(analyzeDocument(new File(["hello"], "notes.pdf"))).rejects.toThrow();
    expect(calls).toHaveLength(0);
    const result = await analyzeDocument(file);
    expect(Array.from(result.text).slice(8, 22).join("")).toBe("me@example.com");
    await redactDocument({
      file,
      analysisId: result.analysisId,
      detections: result.detections.map(({ id, type, start, end }) => ({
        id, type, start, end, status: id === "det_2" ? "approved" : "rejected",
      })),
    });

    expect(calls.map(({ url }) => url)).toEqual(["/analyze/document", "/redact/document"]);
    for (const call of calls) {
      const uploaded = call.body?.get("file") as File;
      expect(uploaded.name).toBe(file.name);
      expect(await uploaded.text()).toBe(text);
    }
    expect(JSON.parse(calls[1].body?.get("review") as string)).toEqual({
      analysisId: "ana_1",
      detections: [
        { id: "det_2", type: "EMAIL", start: 8, end: 22, status: "approved" },
        { id: "det_1", type: "OTHER", start: 0, end: 1, status: "rejected" },
      ],
    });
    expect(documentAnalysisResponseSchema.safeParse({ ...analysis, textLength: 1 }).success).toBe(false);
  } finally {
    api.defaults.adapter = previousAdapter;
  }
});
