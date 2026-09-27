import { z } from "zod";

export const MAX_TEXT_LENGTH = 50_000;
export const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
export const MAX_DOCUMENT_SIZE = 256 * 1024;
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
export const piiTypeSchema = z.enum([
  "PERSON", "EMAIL", "PHONE", "ADDRESS", "DATE_OF_BIRTH", "IP_ADDRESS",
  "AADHAAR", "PAN", "BANK_ACCOUNT", "PAYMENT_CARD",
]);
const analysisIdSchema = z.string().regex(/^ana_[0-9a-f]{32}$/);
const markIdSchema = z.string().regex(/^(det|man)_[1-9]\d*$/);
const finalStatusSchema = reviewStatusSchema.exclude(["pending"]);

export const detectionSchema = z.object({
  id: z.string(),
  type: piiTypeSchema,
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
  analysisId: analysisIdSchema,
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

export const documentFileSchema = z
  .custom<File>((file) => typeof File !== "undefined" && file instanceof File, {
    message: "Choose a text document.",
  })
  .refine((file) => file.size > 0, "Choose a non-empty text document.")
  .refine((file) => file.size <= MAX_DOCUMENT_SIZE, "Text documents must be at most 256 KiB.")
  .refine((file) => /\.(txt|md|markdown)$/i.test(file.name), "Use a .txt, .md, or .markdown file.");

export const documentFormSchema = z.object({ file: documentFileSchema });

export const documentAnalysisResponseSchema = textAnalysisResponseSchema.extend({
  text: z.string(),
  detections: z.array(detectionSchema.extend({ status: z.literal("pending") })),
}).superRefine((analysis, context) => {
  if (Array.from(analysis.text).length !== analysis.textLength) {
    context.addIssue({ code: "custom", message: "Document text length does not match its analysis." });
  }
  const ids = new Set<string>();
  for (const detection of analysis.detections) {
    if (ids.has(detection.id) || detection.end > analysis.textLength || detection.start >= detection.end) {
      context.addIssue({ code: "custom", message: "Document detections contain invalid spans." });
      break;
    }
    ids.add(detection.id);
  }
});

export const redactDocumentRequestSchema = z.object({
  file: documentFileSchema,
  analysisId: analysisIdSchema,
  detections: z.array(z.object({
    id: markIdSchema,
    type: piiTypeSchema,
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    status: finalStatusSchema,
  }).strict()),
});

export const redactAudioRequestSchema = z.object({
  analysisId: analysisIdSchema,
  file: audioFileSchema,
  detections: z.array(
    z.object({
      id: markIdSchema,
      type: piiTypeSchema.optional(),
      audioStartMs: z.number().int().nonnegative(),
      audioEndMs: z.number().int().positive(),
      status: finalStatusSchema,
    }).strict().refine((mark) => !mark.id.startsWith("man_") || mark.type, "Manual audio marks need a type."),
  ),
});

export const redactTextRequestSchema = z.object({
  text: textSchema,
  analysisId: analysisIdSchema,
  detections: redactDocumentRequestSchema.shape.detections,
});

export type ReviewStatus = z.infer<typeof reviewStatusSchema>;
export type Detection = z.infer<typeof detectionSchema>;
export type AudioDetection = z.infer<typeof audioDetectionSchema>;
export type TextAnalysisResponse = z.infer<typeof textAnalysisResponseSchema>;
export type AudioAnalysisResponse = z.infer<typeof audioAnalysisResponseSchema>;
export type AnalyzeTextInput = z.infer<typeof textFormSchema>;
export type AnalyzeAudioInput = z.infer<typeof audioFileSchema>;
export type AnalyzeDocumentInput = z.infer<typeof documentFileSchema>;
export type RedactAudioRequest = z.infer<typeof redactAudioRequestSchema>;
export type DocumentAnalysisResponse = z.infer<typeof documentAnalysisResponseSchema>;
export type RedactDocumentRequest = z.infer<typeof redactDocumentRequestSchema>;
export type RedactTextRequest = z.infer<typeof redactTextRequestSchema>;
export type PiiType = z.infer<typeof piiTypeSchema>;
