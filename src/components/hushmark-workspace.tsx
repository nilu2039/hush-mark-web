"use client";

import {
  RiArrowRightLine,
  RiCheckboxCircleFill,
  RiCheckLine,
  RiCloseLine,
  RiDownloadLine,
  RiFileCopyLine,
  RiFileMusicLine,
  RiInformationLine,
  RiLoader4Line,
  RiLock2Line,
  RiMicLine,
  RiPlayLine,
  RiRecordCircleLine,
  RiShieldCheckFill,
  RiSparklingLine,
  RiStopCircleLine,
  RiText,
  RiUploadCloud2Line,
} from "@remixicon/react";
import { useForm } from "@tanstack/react-form";
import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { hasAudioSignal } from "@/lib/audio";
import { formatEntityType, redactText, textForDetection } from "@/lib/pii";
import {
  useAnalyzeAudioMutation,
  useAnalyzeTextMutation,
  useRedactAudioMutation,
} from "@/mutations";
import {
  audioFormSchema,
  MAX_TEXT_LENGTH,
  textFormSchema,
  type AudioAnalysisResponse,
  type AudioDetection,
  type Detection,
  type ReviewStatus,
  type TextAnalysisResponse,
} from "@/schema/hushmark";

type Mode = "text" | "audio";
type Decisions = Record<string, ReviewStatus>;

function pendingDecisions(detections: Detection[]): Decisions {
  return Object.fromEntries(detections.map((detection) => [detection.id, "pending"]));
}

function fieldError(errors: unknown[]) {
  const error = errors[0];
  if (!error) return null;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) return String(error.message);
  return "Check this field and try again.";
}

function ErrorMessage({ error }: { error: Error | null }) {
  if (!error) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive" role="alert">
      <RiInformationLine className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{error.message}</span>
    </div>
  );
}

function LoadingLabel({ children }: { children: ReactNode }) {
  return (
    <>
      <RiLoader4Line className="size-4 animate-spin" aria-hidden="true" />
      {children}
    </>
  );
}

function HighlightedText({
  text,
  detections,
  decisions,
  onSelect,
}: {
  text: string;
  detections: Detection[];
  decisions: Decisions;
  onSelect?: (detection: Detection) => void;
}) {
  const points = Array.from(text);
  const content: ReactNode[] = [];
  let cursor = 0;

  for (const detection of detections) {
    content.push(points.slice(cursor, detection.start).join(""));
    const status = decisions[detection.id];
    const className =
      status === "approved"
        ? "bg-primary/18 text-primary ring-primary/25"
        : status === "rejected"
          ? "bg-muted text-muted-foreground line-through decoration-muted-foreground/40 ring-border"
          : "bg-accent/25 text-foreground ring-accent/45";
    const value = points.slice(detection.start, detection.end).join("");

    content.push(
      onSelect ? (
        <button
          type="button"
          key={detection.id}
          className={`rounded px-1 py-0.5 font-medium ring-1 transition hover:ring-2 ${className}`}
          onClick={() => onSelect(detection)}
          title={`Play ${formatEntityType(detection.type)} segment`}
        >
          {value}
        </button>
      ) : (
        <mark key={detection.id} className={`rounded px-1 py-0.5 ring-1 ${className}`}>
          {value}
        </mark>
      ),
    );
    cursor = detection.end;
  }

  content.push(points.slice(cursor).join(""));
  return <>{content}</>;
}

function ReviewList({
  text,
  detections,
  decisions,
  onDecision,
  onPreview,
}: {
  text: string;
  detections: Detection[];
  decisions: Decisions;
  onDecision: (id: string, status: Exclude<ReviewStatus, "pending">) => void;
  onPreview?: (detection: AudioDetection) => void;
}) {
  if (detections.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-primary/15 bg-primary/6 px-6 py-10 text-center">
        <span className="mb-3 grid size-11 place-items-center rounded-full bg-primary/12 text-primary">
          <RiCheckboxCircleFill className="size-6" aria-hidden="true" />
        </span>
        <h3 className="font-semibold">No sensitive details found</h3>
        <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
          The analysis completed successfully and returned no items to review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {detections.map((detection, index) => {
        const status = decisions[detection.id];
        const audioDetection = "audioStartMs" in detection ? (detection as AudioDetection) : null;
        return (
          <article
            key={detection.id}
            className="rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    {formatEntityType(detection.type)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(detection.confidence * 100)}% match · {detection.source}
                  </span>
                  {audioDetection && (
                    <span className="text-xs text-muted-foreground">
                      {(audioDetection.audioStartMs / 1000).toFixed(1)}–
                      {(audioDetection.audioEndMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
                <p className="mt-2 truncate text-base font-medium" title={textForDetection(text, detection.start, detection.end)}>
                  “{textForDetection(text, detection.start, detection.end)}”
                </p>
              </div>
              {audioDetection && onPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Play ${formatEntityType(detection.type)} segment`}
                  onClick={() => onPreview(audioDetection)}
                >
                  <RiPlayLine aria-hidden="true" />
                </Button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:ml-11 sm:flex">
              <Button
                type="button"
                size="lg"
                variant={status === "approved" ? "default" : "outline"}
                aria-pressed={status === "approved"}
                className="sm:min-w-28"
                onClick={() => onDecision(detection.id, "approved")}
              >
                <RiCheckLine aria-hidden="true" />
                Redact
              </Button>
              <Button
                type="button"
                size="lg"
                variant={status === "rejected" ? "secondary" : "outline"}
                aria-pressed={status === "rejected"}
                className="sm:min-w-28"
                onClick={() => onDecision(detection.id, "rejected")}
              >
                <RiCloseLine aria-hidden="true" />
                Keep
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ReviewHeader({
  detections,
  decisions,
  onSetAll,
}: {
  detections: Detection[];
  decisions: Decisions;
  onSetAll: (status: Exclude<ReviewStatus, "pending">) => void;
}) {
  const reviewed = detections.filter((detection) => decisions[detection.id] !== "pending").length;
  const percent = detections.length ? (reviewed / detections.length) * 100 : 100;

  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">Review</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Choose what to protect</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {detections.length === 0
              ? "Analysis complete"
              : `${reviewed} of ${detections.length} reviewed`}
          </p>
        </div>
        {detections.length > 0 && (
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onSetAll("rejected")}>
              Keep all
            </Button>
            <Button type="button" variant="outline" onClick={() => onSetAll("approved")}>
              Redact all
            </Button>
          </div>
        )}
      </div>
      {detections.length > 0 && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}

function TextWorkspace() {
  const analyzeMutation = useAnalyzeTextMutation();
  const [review, setReview] = useState<
    (TextAnalysisResponse & { text: string; decisions: Decisions }) | null
  >(null);
  const [copied, setCopied] = useState(false);

  const form = useForm({
    defaultValues: { text: "" },
    validators: { onSubmit: textFormSchema },
    onSubmit: async ({ value }) => {
      const result = await analyzeMutation.mutateAsync(value);
      setReview({ ...result, text: value.text, decisions: pendingDecisions(result.detections) });
    },
  });

  function updateDecision(id: string, status: Exclude<ReviewStatus, "pending">) {
    setReview((current) =>
      current ? { ...current, decisions: { ...current.decisions, [id]: status } } : current,
    );
  }

  function setAll(status: Exclude<ReviewStatus, "pending">) {
    setReview((current) =>
      current
        ? {
            ...current,
            decisions: Object.fromEntries(current.detections.map(({ id }) => [id, status])),
          }
        : current,
    );
  }

  const safeText = review ? redactText(review.text, review.detections, review.decisions) : "";
  const pending = review?.detections.filter(({ id }) => review.decisions[id] === "pending").length ?? 0;

  async function copySafeText() {
    await navigator.clipboard.writeText(safeText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <form
        className="rounded-3xl border bg-card p-4 shadow-xl shadow-primary/5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Paste or type your text</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your content is not stored by the service.</p>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary sm:flex">
            <RiLock2Line className="size-3.5" aria-hidden="true" />
            Private by design
          </span>
        </div>

        <form.Field name="text">
          {(field) => {
            const error = field.state.meta.isTouched ? fieldError(field.state.meta.errors) : null;
            return (
              <div>
                <label htmlFor={field.name} className="sr-only">Text to analyze</label>
                <textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  rows={9}
                  placeholder="Try: Please email Arjun at arjun@example.com or call +91 98765 43210."
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "text-error" : undefined}
                  className="min-h-52 w-full resize-y rounded-2xl border bg-background px-4 py-4 text-[15px] leading-7 outline-none transition placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-4 focus:ring-primary/10"
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                    if (review && event.target.value !== review.text) setReview(null);
                    analyzeMutation.reset();
                  }}
                />
                <div className="mt-2 flex min-h-5 items-center justify-between text-xs">
                  <span id="text-error" className="text-destructive">{error}</span>
                  <span className="ml-auto text-muted-foreground">
                    {Array.from(field.state.value).length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          }}
        </form.Field>

        <div className="mt-3 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <RiInformationLine className="size-4" aria-hidden="true" />
            You decide whether every match is redacted or kept.
          </p>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" size="lg" className="h-11 px-5" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? (
                  <LoadingLabel>Analyzing…</LoadingLabel>
                ) : (
                  <>
                    <RiSparklingLine aria-hidden="true" />
                    Analyze text
                    <RiArrowRightLine aria-hidden="true" />
                  </>
                )}
              </Button>
            )}
          </form.Subscribe>
        </div>
        <div className="mt-4"><ErrorMessage error={analyzeMutation.error} /></div>
      </form>

      {review && (
        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
          <div className="min-w-0">
            <div className="sticky top-6 rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
              <p className="mb-3 text-xs font-semibold tracking-widest text-primary uppercase">Analyzed text</p>
              <div className="max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl bg-muted/55 p-4 text-[15px] leading-8">
                <HighlightedText text={review.text} detections={review.detections} decisions={review.decisions} />
              </div>

              {pending === 0 && (
                <div className="mt-5 border-t pt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">Protected copy</p>
                      <p className="text-xs text-muted-foreground">Approved details are replaced locally.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => void copySafeText()}>
                      {copied ? <RiCheckLine aria-hidden="true" /> : <RiFileCopyLine aria-hidden="true" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <div className="max-h-56 overflow-auto whitespace-pre-wrap rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm leading-7">
                    {safeText}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <ReviewHeader detections={review.detections} decisions={review.decisions} onSetAll={setAll} />
            <ReviewList
              text={review.text}
              detections={review.detections}
              decisions={review.decisions}
              onDecision={updateDecision}
            />
          </div>
        </section>
      )}
    </div>
  );
}

function AudioWorkspace() {
  const analyzeMutation = useAnalyzeAudioMutation();
  const redactMutation = useRedactAudioMutation();
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const graphFrameRef = useRef<number | null>(null);
  const heardAudioRef = useRef(false);
  const chunksRef = useRef<Blob[]>([]);
  const previewTimerRef = useRef<number | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState("");
  const [activeMicrophoneName, setActiveMicrophoneName] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<Error | null>(null);
  const [review, setReview] = useState<
    (AudioAnalysisResponse & { file: File; decisions: Decisions }) | null
  >(null);

  const form = useForm({
    defaultValues: { file: null as File | null },
    validators: { onSubmit: audioFormSchema },
    onSubmit: async ({ value }) => {
      if (!value.file) return;
      const result = await analyzeMutation.mutateAsync(value.file);
      setReview({ ...result, file: value.file, decisions: pendingDecisions(result.detections) });
    },
  });

  const stopAudioGraph = useCallback(() => {
    if (graphFrameRef.current !== null) window.cancelAnimationFrame(graphFrameRef.current);
    graphFrameRef.current = null;
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
  }, []);

  const refreshMicrophones = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setMicrophones(devices.filter((device) => device.kind === "audioinput" && device.deviceId));
    } catch {
      setMicrophones([]);
    }
  }, []);

  useEffect(() => {
    navigator.mediaDevices?.addEventListener?.("devicechange", refreshMicrophones);
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", refreshMicrophones);
  }, [refreshMicrophones]);

  useEffect(() => {
    if (!fileUrl) return;
    return () => URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  useEffect(() => () => {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
  }, [outputUrl]);

  useEffect(() => () => {
    if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    stopAudioGraph();
  }, [stopAudioGraph]);

  function startAudioGraph(stream: MediaStream, audioContext: AudioContext) {
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    audioContext.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    heardAudioRef.current = false;

    function draw() {
      analyser.getFloatTimeDomainData(samples);
      if (hasAudioSignal(samples)) heardAudioRef.current = true;

      const canvas = waveformRef.current;
      const context = canvas?.getContext("2d");
      if (canvas && context) {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const scale = window.devicePixelRatio;
        if (canvas.width !== width * scale || canvas.height !== height * scale) {
          canvas.width = width * scale;
          canvas.height = height * scale;
        }
        context.setTransform(scale, 0, 0, scale, 0, 0);
        context.clearRect(0, 0, width, height);
        context.beginPath();
        context.lineWidth = 2;
        context.strokeStyle = getComputedStyle(canvas).color;
        for (let index = 0; index < samples.length; index += 1) {
          const x = (index / (samples.length - 1)) * width;
          const y = height / 2 - samples[index] * height * 2;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
      }

      graphFrameRef.current = window.requestAnimationFrame(draw);
    }

    draw();
  }

  function chooseFile(file: File) {
    form.setFieldValue("file", file);
    form.validateField("file", "change");
    setFileUrl(URL.createObjectURL(file));
    setOutputUrl(null);
    setReview(null);
    analyzeMutation.reset();
    redactMutation.reset();
    setRecordingError(null);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) chooseFile(file);
  }

  async function startRecording() {
    try {
      setRecordingError(null);
      setActiveMicrophoneName("");
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedMicrophoneId
          ? { deviceId: { exact: selectedMicrophoneId } }
          : true,
      });
      streamRef.current = stream;
      const microphoneName = stream.getAudioTracks()[0]?.label || "the selected microphone";
      setActiveMicrophoneName(microphoneName);
      void refreshMicrophones();
      await audioContext.resume();
      startAudioGraph(stream, audioContext);
      const recorder = new MediaRecorder(stream);
      let failed = false;
      chunksRef.current = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const heardAudio = heardAudioRef.current;
        stopAudioGraph();
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setIsRecording(false);
        if (failed) return;

        const type = chunksRef.current[0]?.type || recorder.mimeType || "audio/webm";
        const recording = new Blob(chunksRef.current, { type });
        if (!recording.size) {
          setRecordingError(new Error("No audio was captured. Check your microphone and try again."));
          return;
        }
        const extension = type.split(";")[0].split("/")[1]?.replace("x-", "") || "webm";
        chooseFile(new File([recording], `recording.${extension}`, { type }));
        if (!heardAudio) {
          setRecordingError(new Error(`No sound was detected from ${microphoneName}. On Mac, enable your browser in System Settings → Privacy & Security → Microphone, then try again.`));
        }
      };
      recorder.onerror = () => {
        failed = true;
        stopAudioGraph();
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setRecordingError(new Error("The browser could not record this microphone. Try again or upload a file."));
      };
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      stopAudioGraph();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      const message = error instanceof DOMException && error.name === "OverconstrainedError"
        ? "That microphone is no longer available. Choose another input and try again."
        : error instanceof DOMException && error.name === "NotAllowedError"
          ? "Microphone access was denied. Allow this site in your browser and your browser in your system's microphone settings."
          : "The microphone could not start. Choose another input or upload an audio file.";
      setRecordingError(new Error(message));
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function updateDecision(id: string, status: Exclude<ReviewStatus, "pending">) {
    setReview((current) =>
      current ? { ...current, decisions: { ...current.decisions, [id]: status } } : current,
    );
  }

  function setAll(status: Exclude<ReviewStatus, "pending">) {
    setReview((current) =>
      current
        ? {
            ...current,
            decisions: Object.fromEntries(current.detections.map(({ id }) => [id, status])),
          }
        : current,
    );
  }

  function previewDetection(detection: AudioDetection) {
    const player = audioRef.current;
    if (!player) return;
    if (previewTimerRef.current) window.clearTimeout(previewTimerRef.current);
    player.currentTime = detection.audioStartMs / 1000;
    void player.play();
    previewTimerRef.current = window.setTimeout(
      () => player.pause(),
      detection.audioEndMs - detection.audioStartMs,
    );
  }

  async function exportAudio() {
    if (!review) return;
    const detections = review.detections.map((detection) => ({
      id: detection.id,
      status: review.decisions[detection.id] as Exclude<ReviewStatus, "pending">,
      audioStartMs: detection.audioStartMs,
      audioEndMs: detection.audioEndMs,
    }));
    const blob = await redactMutation.mutateAsync({
      analysisId: review.analysisId,
      file: review.file,
      detections,
    });
    setOutputUrl(URL.createObjectURL(blob));
  }

  const pending = review?.detections.filter(({ id }) => review.decisions[id] === "pending").length ?? 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <form
        className="rounded-3xl border bg-card p-4 shadow-xl shadow-primary/5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <div className="mb-4">
          <h2 className="font-semibold">Upload or record audio</h2>
          <p className="mt-1 text-sm text-muted-foreground">Choose a completed recording up to 25 MB.</p>
        </div>

        <form.Field name="file">
          {(field) => {
            const error = field.state.meta.isTouched ? fieldError(field.state.meta.errors) : null;
            const file = field.state.value;
            return (
              <div>
                <input
                  ref={inputRef}
                  className="sr-only"
                  type="file"
                  accept=".flac,.m4a,.mp3,.mp4,.mpeg,.mpga,.ogg,.wav,.webm,audio/*"
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    const selected = event.target.files?.[0];
                    if (selected) chooseFile(selected);
                  }}
                />
                <div
                  className="rounded-2xl border border-dashed bg-background p-6 text-center transition hover:border-primary/50 hover:bg-primary/3 sm:p-9"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={onDrop}
                >
                  {file ? (
                    <div className="mx-auto flex max-w-lg items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-sm">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <RiFileMusicLine className="size-6" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{file.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <Button type="button" variant="ghost" onClick={() => inputRef.current?.click()}>
                        Replace
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                        <RiUploadCloud2Line className="size-6" aria-hidden="true" />
                      </span>
                      <p className="mt-4 font-medium">Drop an audio file here</p>
                      <p className="mt-1 text-sm text-muted-foreground">or choose a file from your device</p>
                      <Button type="button" variant="outline" className="mt-4" onClick={() => inputRef.current?.click()}>
                        Browse files
                      </Button>
                    </>
                  )}
                </div>
                <p className="mt-2 min-h-5 text-xs text-destructive">{error}</p>
              </div>
            );
          }}
        </form.Field>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
          or
        </div>

        <div className="mb-4 max-w-md">
          <label htmlFor="microphone-input" className="mb-2 block text-sm font-medium">
            Microphone input
          </label>
          <select
            id="microphone-input"
            value={selectedMicrophoneId}
            disabled={isRecording}
            onFocus={() => void refreshMicrophones()}
            onChange={(event) => setSelectedMicrophoneId(event.target.value)}
            className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-primary/60 focus:ring-4 focus:ring-primary/10 disabled:opacity-50"
          >
            <option value="">System default</option>
            {microphones.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${index + 1}`}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            On Mac, allow this site to use the microphone and enable your browser (such as Google Chrome) in System Settings → Privacy &amp; Security → Microphone.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {isRecording ? (
            <Button type="button" variant="destructive" size="lg" onClick={stopRecording}>
              <RiStopCircleLine aria-hidden="true" />
              Stop recording
              <span className="ml-1 size-2 animate-pulse rounded-full bg-destructive" />
            </Button>
          ) : (
            <Button type="button" variant="outline" size="lg" onClick={() => void startRecording()}>
              <RiRecordCircleLine aria-hidden="true" />
              Record with microphone
            </Button>
          )}

          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting, state.values.file] as const}>
            {([canSubmit, isSubmitting, file]) => (
              <Button type="submit" size="lg" className="h-11 px-5" disabled={!canSubmit || isSubmitting || !file || isRecording}>
                {isSubmitting ? (
                  <LoadingLabel>Transcribing…</LoadingLabel>
                ) : (
                  <>
                    <RiSparklingLine aria-hidden="true" />
                    Analyze audio
                    <RiArrowRightLine aria-hidden="true" />
                  </>
                )}
              </Button>
            )}
          </form.Subscribe>
        </div>

        {isRecording && (
          <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4" aria-live="polite">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                <span className="size-2 animate-pulse rounded-full bg-destructive" />
                Live microphone input
              </p>
              <span className="truncate text-xs text-muted-foreground" title={activeMicrophoneName}>
                {activeMicrophoneName || "Speak normally"}
              </span>
            </div>
            <canvas
              ref={waveformRef}
              className="h-24 w-full text-primary"
              role="img"
              aria-label="Live microphone waveform"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              The waveform should move while you speak. A flat line means the browser is not receiving sound.
            </p>
          </div>
        )}

        {fileUrl && (
          <audio ref={audioRef} className="mt-5 w-full" controls src={fileUrl} preload="metadata">
            Your browser does not support audio playback.
          </audio>
        )}
        <div className="mt-4 space-y-3">
          <ErrorMessage error={recordingError} />
          <ErrorMessage error={analyzeMutation.error} />
        </div>
      </form>

      {review && (
        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
          <div className="min-w-0">
            <div className="sticky top-6 rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
              <p className="mb-3 text-xs font-semibold tracking-widest text-primary uppercase">Transcript</p>
              <div className="max-h-96 overflow-auto whitespace-pre-wrap rounded-2xl bg-muted/55 p-4 text-[15px] leading-8">
                <HighlightedText
                  text={review.transcript}
                  detections={review.detections}
                  decisions={review.decisions}
                  onSelect={(detection) => previewDetection(detection as AudioDetection)}
                />
              </div>
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <RiPlayLine className="size-3.5" aria-hidden="true" />
                Select a highlighted phrase to hear that interval.
              </p>

              <div className="mt-5 border-t pt-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">Create protected audio</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pending > 0 ? `Review ${pending} remaining ${pending === 1 ? "item" : "items"}.` : "Ready to replace approved intervals with a beep."}
                    </p>
                  </div>
                  <Button type="button" size="lg" disabled={pending > 0 || redactMutation.isPending} onClick={() => void exportAudio()}>
                    {redactMutation.isPending ? (
                      <LoadingLabel>Creating…</LoadingLabel>
                    ) : (
                      <>
                        <RiShieldCheckFill aria-hidden="true" />
                        Create MP3
                      </>
                    )}
                  </Button>
                </div>
                <div className="mt-3"><ErrorMessage error={redactMutation.error} /></div>

                {outputUrl && (
                  <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/6 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">Protected audio is ready</p>
                        <p className="text-xs text-muted-foreground">Listen through before downloading.</p>
                      </div>
                      <Button nativeButton={false} render={<a href={outputUrl} download="redacted.mp3" />}>
                        <RiDownloadLine aria-hidden="true" />
                        Download
                      </Button>
                    </div>
                    <audio className="w-full" controls src={outputUrl} preload="metadata">
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div>
            <ReviewHeader detections={review.detections} decisions={review.decisions} onSetAll={setAll} />
            <ReviewList
              text={review.transcript}
              detections={review.detections}
              decisions={review.decisions}
              onDecision={updateDecision}
              onPreview={previewDetection}
            />
          </div>
        </section>
      )}
    </div>
  );
}

export function HushmarkWorkspace() {
  const [mode, setMode] = useState<Mode>("text");

  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-96 bg-[radial-gradient(circle_at_top,var(--color-primary)_0,transparent_62%)] opacity-8" />
      <header className="relative z-10 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <RiShieldCheckFill className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight">HushMark</p>
              <p className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">Privacy studio</p>
            </div>
          </div>
          <span className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            API v1
          </span>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="mx-auto mb-8 max-w-3xl text-center sm:mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/6 px-3 py-1.5 text-xs font-semibold text-primary">
            <RiLock2Line className="size-3.5" aria-hidden="true" />
            Nothing is stored
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            Protect what matters.
            <span className="block text-primary">Share with confidence.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Find personal information in text or speech, review every match, and decide exactly what gets hidden.
          </p>
        </section>

        <div className="mx-auto mb-6 grid max-w-md grid-cols-2 rounded-2xl border bg-muted/70 p-1.5" role="tablist" aria-label="Input type">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "text"}
            className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${mode === "text" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setMode("text")}
          >
            <RiText className="size-4" aria-hidden="true" />
            Text
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "audio"}
            className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${mode === "audio" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setMode("audio")}
          >
            <RiMicLine className="size-4" aria-hidden="true" />
            Audio
          </button>
        </div>

        {mode === "text" ? <TextWorkspace /> : <AudioWorkspace />}

        <footer className="mt-12 flex flex-col items-center justify-between gap-3 border-t py-6 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <p>HushMark processes each request without retaining your content.</p>
          <p>Review every detection — confidence is a hint, not a decision.</p>
        </footer>
      </div>
    </main>
  );
}
