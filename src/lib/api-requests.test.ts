import { expect, test } from "bun:test";
import { AxiosError } from "axios";
import { api } from "@/lib/api";
import { redactAudio, redactText } from "@/lib/api-requests";

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
