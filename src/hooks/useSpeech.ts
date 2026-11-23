"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/* Tipos mínimos de la Web Speech API (no todos los navegadores la traen en lib.dom). */
interface SpeechAlternative { transcript: string }
interface SpeechResult { isFinal: boolean; 0: SpeechAlternative }
interface SpeechEvent { resultIndex: number; results: ArrayLike<SpeechResult> }
interface SpeechErrorEvent { error: string }
interface Recognizer {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type RecognizerCtor = new () => Recognizer;

function getCtor(): RecognizerCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognizerCtor; webkitSpeechRecognition?: RecognizerCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
const noop = () => () => {};

/** ¿El navegador puede transcribir voz? (false en el servidor y en navegadores sin soporte). */
export function useSpeechSupported() {
  return useSyncExternalStore(noop, () => Boolean(getCtor()), () => false);
}

function speechLang() {
  const l = typeof navigator !== "undefined" ? navigator.language : "";
  return l?.toLowerCase().startsWith("es") ? l : "es-MX";
}

export type SpeechStatus = "idle" | "listening" | "error";

/** Mensajes claros para cada error del reconocimiento de voz. */
export function speechErrorText(code: string | null) {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed": return "El navegador no tiene permiso para usar el micrófono. Habilitalo en la configuración del sitio y probá de nuevo.";
    case "no-speech": return "No te escuché. Tocá el micrófono y hablá cerca del teléfono.";
    case "audio-capture": return "No encontramos un micrófono disponible.";
    case "network": return "El reconocimiento de voz necesita internet. Revisá la conexión.";
    case "unsupported": return "Este navegador no reconoce voz.";
    default: return code ? "No pudimos escucharte. Probá de nuevo." : null;
  }
}

/**
 * Reconocimiento de voz de una frase: escucha, muestra la transcripción parcial en vivo
 * y entrega el texto final a `onFinal` cuando la persona deja de hablar.
 */
export function useSpeech(onFinal: (text: string) => void) {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognizer | null>(null);
  const onFinalRef = useRef(onFinal);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) { setError("unsupported"); setStatus("error"); return; }
    recRef.current?.abort();
    const rec = new Ctor();
    rec.lang = speechLang();
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let finalText = "";
    let failed = false;
    rec.onresult = (e) => {
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else partial += r[0].transcript;
      }
      setInterim((finalText + partial).trim());
    };
    rec.onerror = (e) => {
      if (e.error === "aborted") return;
      failed = true;
      setError(e.error);
      setStatus("error");
    };
    rec.onend = () => {
      if (recRef.current === rec) recRef.current = null;
      const text = finalText.trim();
      if (text) { setStatus("idle"); onFinalRef.current(text); }
      else if (!failed) { setError("no-speech"); setStatus("error"); }
    };
    setError(null);
    setInterim("");
    setStatus("listening");
    recRef.current = rec;
    try { navigator.vibrate?.(10); } catch { /* sin vibración */ }
    try { rec.start(); } catch { setError("not-allowed"); setStatus("error"); }
  }, []);

  const stop = useCallback(() => { recRef.current?.stop(); }, []);
  const cancel = useCallback(() => { recRef.current?.abort(); recRef.current = null; setStatus("idle"); setInterim(""); }, []);
  useEffect(() => () => recRef.current?.abort(), []);

  return { status, interim, error, start, stop, cancel };
}
