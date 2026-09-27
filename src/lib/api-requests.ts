import axios from "axios";
import { api } from "@/lib/api";
import {
  analyzeTextRequestSchema,
  apiErrorSchema,
  audioAnalysisResponseSchema,
  audioFileSchema,
  documentAnalysisResponseSchema,
  documentFileSchema,
  redactDocumentRequestSchema,
  redactAudioRequestSchema,
  textAnalysisResponseSchema,
  textFormSchema,
  type AnalyzeAudioInput,
  type AnalyzeDocumentInput,
  type AnalyzeTextInput,
  type RedactAudioRequest,
  type RedactDocumentRequest,
} from "@/schema/hushmark";

export class ApiRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function toApiError(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return new ApiRequestError("service_unavailable", "Something went wrong. Try again.");
  }

  let body: unknown = error.response?.data;
  if (body instanceof Blob) {
    try {
      body = JSON.parse(await body.text());
    } catch {
      body = undefined;
    }
  }

  const parsed = apiErrorSchema.safeParse(body);
  return new ApiRequestError(
    parsed.success ? parsed.data.code : "service_unavailable",
    parsed.success ? parsed.data.message : "The HushMark service is unavailable. Try again.",
    error.response?.status,
  );
}

export async function analyzeText(input: AnalyzeTextInput) {
  const validatedInput = textFormSchema.parse(input);
  const request = analyzeTextRequestSchema.parse({ ...validatedInput, locale: "en-IN" });
  try {
    const { data } = await api.post("/analyze", request);
    return textAnalysisResponseSchema.parse(data);
  } catch (error) {
    throw await toApiError(error);
  }
}

export async function analyzeAudio(file: AnalyzeAudioInput) {
  const validatedFile = audioFileSchema.parse(file);
  const form = new FormData();
  form.append("file", validatedFile, validatedFile.name);

  try {
    const { data } = await api.post("/analyze/audio", form);
    return audioAnalysisResponseSchema.parse(data);
  } catch (error) {
    throw await toApiError(error);
  }
}

export async function redactAudio(input: RedactAudioRequest) {
  const request = redactAudioRequestSchema.parse(input);
  const form = new FormData();
  form.append("file", request.file, request.file.name);
  form.append(
    "review",
    JSON.stringify({ analysisId: request.analysisId, detections: request.detections }),
  );

  try {
    const { data } = await api.post<Blob>("/redact/audio", form, {
      responseType: "blob",
    });
    return data;
  } catch (error) {
    throw await toApiError(error);
  }
}

export async function analyzeDocument(file: AnalyzeDocumentInput) {
  const validatedFile = documentFileSchema.parse(file);
  const form = new FormData();
  form.append("file", validatedFile, validatedFile.name);

  try {
    const { data } = await api.post("/analyze/document", form);
    return documentAnalysisResponseSchema.parse(data);
  } catch (error) {
    throw await toApiError(error);
  }
}

export async function redactDocument(input: RedactDocumentRequest) {
  const request = redactDocumentRequestSchema.parse(input);
  const form = new FormData();
  form.append("file", request.file, request.file.name);
  form.append("review", JSON.stringify({ analysisId: request.analysisId, detections: request.detections }));

  try {
    const { data } = await api.post<Blob>("/redact/document", form, { responseType: "blob" });
    return data;
  } catch (error) {
    throw await toApiError(error);
  }
}
