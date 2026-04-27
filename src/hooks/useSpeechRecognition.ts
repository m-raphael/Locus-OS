import { useCallback, useRef, useState } from "react";

export type SpeechState = "idle" | "listening" | "processing";

interface UseSpeechRecognitionOptions {
  onFinalResult: (text: string) => void;
  onInterimResult?: (text: string) => void;
  lang?: string;
}

export function useSpeechRecognition({
  onFinalResult,
  onInterimResult,
  lang = "en-US",
}: UseSpeechRecognitionOptions) {
  const [state, setState] = useState<SpeechState>("idle");
  const recRef = useRef<any>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  const start = useCallback(() => {
    if (!isSupported || state === "listening") return;

    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onstart = () => setState("listening");

    rec.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (const result of Array.from(e.results) as any[]) {
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim) onInterimResult?.(interim);
      if (final) {
        setState("processing");
        onFinalResult(final.trim());
      }
    };

    rec.onerror = () => setState("idle");
    rec.onend = () => setState("idle");

    rec.start();
    recRef.current = rec;
  }, [isSupported, state, lang, onFinalResult, onInterimResult]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
  }, []);

  const toggle = useCallback(() => {
    if (state === "listening") stop();
    else start();
  }, [state, start, stop]);

  return { state, isSupported, start, stop, toggle };
}
