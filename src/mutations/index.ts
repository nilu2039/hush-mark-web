import { useMutation } from "@tanstack/react-query";
import { analyzeAudio, analyzeText, redactAudio } from "@/lib/api-requests";
import { mutationKeys } from "@/lib/query-keys";

export function useAnalyzeTextMutation() {
  return useMutation({ mutationKey: mutationKeys.analyzeText, mutationFn: analyzeText });
}

export function useAnalyzeAudioMutation() {
  return useMutation({ mutationKey: mutationKeys.analyzeAudio, mutationFn: analyzeAudio });
}

export function useRedactAudioMutation() {
  return useMutation({ mutationKey: mutationKeys.redactAudio, mutationFn: redactAudio });
}
