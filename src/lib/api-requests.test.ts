import { expect, test } from "bun:test";
import { AxiosError } from "axios";
import { api } from "@/lib/api";
import { analyzeAudio, redactAudio, redactText } from "@/lib/api-requests";
import { audioRangeFromTranscriptSelection } from "@/lib/audio";

const analysisId = "ana_11111111111111111111111111111111";

test("text export sends only final marks and reads plain text", async () => {
  const previous = api.defaults.adapter;
  let body: unknown;
  api.defaults.adapter = async (config) => {
    body = config.data;
    expect(config.url).toBe("/redact");
    expect(config.responseType).toBe("text");
    return { data: "Hi [PERSON]", status: 200, statusText: "OK", headers: {}, config };
  };
  try {
    const result = await redactText({ text: "Hi 👋", analysisId, detections: [
      { id: "man_1", type: "PERSON", start: 3, end: 4, status: "approved" },
    ] });
    expect(result).toBe("Hi [PERSON]");
    expect(JSON.parse(body as string)).toEqual({
      text: "Hi 👋", review: { analysisId, detections: [
        { id: "man_1", type: "PERSON", start: 3, end: 4, status: "approved" },
      ] },
    });
  } finally {
    api.defaults.adapter = previous;
  }
});

test("manual audio marks require a type", async () => {
  const file = new File(["audio"], "clip.mp3");
  await expect(redactAudio({ analysisId, file, detections: [
    { id: "man_1", audioStartMs: 100, audioEndMs: 200, status: "approved" },
  ] })).rejects.toThrow();
});

test("transcript word timings produce the reviewed audio interval", async () => {
  const previous = api.defaults.adapter;
  const file = new File(["audio"], "clip.mp3");
  api.defaults.adapter = async (config) => {
    if (config.url === "/analyze/audio") return {
      data: {
        analysisId, transcript: "👋 Aarav Sen!", textLength: 12,
        wordTimings: [
          { start: 2, end: 7, audioStartMs: 100, audioEndMs: 400 },
          { start: 8, end: 11, audioStartMs: 500, audioEndMs: 800 },
        ],
        detections: [],
      },
      status: 200, statusText: "OK", headers: {}, config,
    };
    expect(config.url).toBe("/redact/audio");
    const form = config.data as FormData;
    expect((form.get("file") as File).name).toBe(file.name);
    expect(JSON.parse(form.get("review") as string)).toEqual({
      analysisId, detections: [{ id: "man_1", type: "PERSON", status: "approved", audioStartMs: 100, audioEndMs: 800 }],
    });
    return { data: new Blob(["mp3"]), status: 200, statusText: "OK", headers: {}, config };
  };
  try {
    const analysis = await analyzeAudio(file);
    const selection = audioRangeFromTranscriptSelection({ start: 4, end: 10 }, analysis.wordTimings);
    expect(selection).not.toBeNull();
    if (!selection) return;
    await redactAudio({ analysisId: analysis.analysisId, file, detections: [
      { id: "man_1", type: "PERSON", status: "approved", audioStartMs: selection.startMs, audioEndMs: selection.endMs },
    ] });
  } finally {
    api.defaults.adapter = previous;
  }
});

test("text export displays the API's safe JSON error message", async () => {
  const previous = api.defaults.adapter;
  api.defaults.adapter = async (config) => {
    throw new AxiosError("request failed", "ERR_BAD_REQUEST", config, null, {
      data: JSON.stringify({ code: "invalid_review", message: "Approved marks overlap." }),
      status: 422, statusText: "Unprocessable Entity", headers: {}, config,
    });
  };
  try {
    await expect(redactText({ text: "Hello", analysisId, detections: [] })).rejects.toThrow("Approved marks overlap.");
  } finally {
    api.defaults.adapter = previous;
  }
});
