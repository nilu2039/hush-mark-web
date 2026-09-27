import { z } from "zod";

export const MAX_TEXT_LENGTH = 50_000;
export const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
export const SUPPORTED_AUDIO_EXTENSIONS = [
  "flac",
  "m4a",
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "ogg",
  "wav",
  "webm",
] as const;

const textSchema = z
  .string()
  .refine((text) => text.trim().length > 0, "Enter some text to analyze.")
  .refine(
    (text) => Array.from(text).length <= MAX_TEXT_LENGTH,
    `Text must contain at most ${MAX_TEXT_LENGTH.toLocaleString()} characters.`,
  );

export const textFormSchema = z.object({ text: textSchema });

export const analyzeTextRequestSchema = z
  .object({
    text: textSchema,
    locale: z.literal("en-IN"),
  })
  .strict();

export const reviewStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const detectionSchema = z.object({
  id: z.string(),
  type: z.string(),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  confidence: z.number().min(0).max(1),
  source: z.string(),
  status: reviewStatusSchema,
});

export const audioDetectionSchema = detectionSchema.extend({
  audioStartMs: z.number().int().nonnegative(),
  audioEndMs: z.number().int().positive(),
});

export const textAnalysisResponseSchema = z.object({
  analysisId: z.string(),
  textLength: z.number().int().nonnegative(),
  detections: z.array(detectionSchema),
});

export const audioAnalysisResponseSchema = textAnalysisResponseSchema.extend({
  transcript: z.string(),
  detections: z.array(audioDetectionSchema),
});

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export const audioFileSchema = z
  .custom<File>((file) => typeof File !== "undefined" && file instanceof File, {
    message: "Choose an audio file.",
  })
  .refine((file) => file.size > 0, "Choose a non-empty audio file.")
  .refine(
    (file) => file.size <= MAX_AUDIO_SIZE,
    "Audio files must be at most 25 MB.",
  )
  .refine((file) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    return SUPPORTED_AUDIO_EXTENSIONS.some((value) => value === extension);
  }, "Use FLAC, M4A, MP3, MP4, MPEG, MPGA, OGG, WAV, or WebM audio.");

export const audioFormSchema = z.object({ file: audioFileSchema });

export const redactAudioRequestSchema = z.object({
  analysisId: z.string().min(1),
  file: audioFileSchema,
  detections: z.array(
    audioDetectionSchema.pick({
      id: true,
      audioStartMs: true,
      audioEndMs: true,
    }).extend({ status: reviewStatusSchema.exclude(["pending"]) }),
  ),
});

export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
export type Detection = z.infer<typeof detectionSchema>;
export type AudioDetection = z.infer<typeof audioDetectionSchema>;
export type TextAnalysisResponse = z.infer<typeof textAnalysisResponseSchema>;
export type AudioAnalysisResponse = z.infer<typeof audioAnalysisResponseSchema>;
export type AnalyzeTextInput = z.infer<typeof textFormSchema>;
export type AnalyzeAudioInput = z.infer<typeof audioFileSchema>;
export type RedactAudioRequest = z.infer<typeof redactAudioRequestSchema>;
