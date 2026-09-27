import { useMutation } from "@tanstack/react-query";
import { analyzeAudio, analyzeDocument, analyzeText, redactAudio, redactDocument, redactText } from "@/lib/api-requests";
import { mutationKeys } from "@/lib/query-keys";

export function useAnalyzeTextMutation() {
  return useMutation({ mutationKey: mutationKeys.analyzeText, mutationFn: analyzeText });
}

export function useRedactTextMutation() {
  return useMutation({ mutationKey: mutationKeys.redactText, mutationFn: redactText });
}

export function useAnalyzeAudioMutation() {
  return useMutation({ mutationKey: mutationKeys.analyzeAudio, mutationFn: analyzeAudio });
}

export function useRedactAudioMutation() {
  return useMutation({ mutationKey: mutationKeys.redactAudio, mutationFn: redactAudio });
}

export function useAnalyzeDocumentMutation() {
  return useMutation({ mutationKey: mutationKeys.analyzeDocument, mutationFn: analyzeDocument });
}

export function useRedactDocumentMutation() {
  return useMutation({ mutationKey: mutationKeys.redactDocument, mutationFn: redactDocument });
}
