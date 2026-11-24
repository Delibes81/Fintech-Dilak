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
  onaudiostart: (() => void) | null;
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

/** Cuánto seguimos esperando a que la persona empiece a hablar (Android corta a los ~4 s). */
const WAIT_FOR_SPEECH_MS = 10_000;
/** Si el micrófono no llegó a abrirse en este tiempo, quedó tomado por otra sesión. */
const MIC_OPEN_GRACE_MS = 1_500;

const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
const PERMISSION_ERRORS = new Set(["not-allowed", "service-not-allowed"]);

/** Mensajes claros para cada error del reconocimiento de voz (con los pasos según el teléfono). */
export function speechErrorText(code: string | null) {
  switch (code) {
    case "denied": return isIOS()
      ? "El micrófono está bloqueado para Dilak. En el iPhone andá a Ajustes → Safari → Micrófono, elegí “Permitir” y volvé a intentar."
      : "El micrófono está bloqueado para Dilak. En Chrome: ⋮ → Configuración → Configuración de sitios → Micrófono, desbloqueá Dilak y volvé a intentar.";
    case "not-allowed":
    case "service-not-allowed": return isIOS()
      ? "El iPhone no dejó usar el reconocimiento de voz. Revisá que esté activado el dictado (Ajustes → General → Teclado → Activar dictado) y el permiso de micrófono (Ajustes → Safari → Micrófono), y tocá el micrófono de nuevo."
      : "No pudimos usar el micrófono. Tocá el botón para intentar de nuevo; si sigue igual, revisá el permiso del micrófono de Dilak en la configuración de sitios de Chrome.";
    case "no-speech": return "No te escuché. Tocá el micrófono y hablá cerca del teléfono.";
    case "audio-capture":
    case "mic-busy": return "El micrófono quedó ocupado. Tocá el botón para reintentar; si sigue, cerrá Dilak por completo y volvé a abrirla, o usá el micrófono del teclado.";
    case "network": return "El reconocimiento de voz necesita internet. Revisá la conexión.";
    case "unsupported": return "Este navegador no reconoce voz.";
    default: return code ? "No pudimos escucharte. Probá de nuevo." : null;
  }
}

/**
 * Reconocimiento de voz de una frase: escucha, muestra la transcripción parcial en vivo
 * y entrega el texto final a `onFinal` cuando la persona deja de hablar.
 *
 * Robustez para teléfonos reales:
 * - Cada sesión ignora los eventos de reconocedores viejos (un `onend` tardío no pisa al nuevo).
 * - Si el reconocedor corta sin marcar el texto como final, usa lo último que se oyó.
 * - Si corta por silencio antes de que la persona hable, vuelve a escuchar solo (hasta 10 s).
 * - Libera el micrófono al cerrar la app, para que no quede tomado la próxima vez.
 */
export function useSpeech(onFinal: (text: string) => void) {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognizer | null>(null);
  const userStopRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);

  const fail = useCallback((code: string) => {
    setError(code); setStatus("error"); setInterim("");
    // Si el permiso quedó bloqueado, lo decimos con los pasos para desbloquearlo
    if (PERMISSION_ERRORS.has(code)) {
      navigator.permissions?.query({ name: "microphone" as PermissionName })
        .then((p) => { if (p.state === "denied") setError((e) => (e === code ? "denied" : e)); })
        .catch(() => { /* el navegador no informa permisos */ });
    }
  }, []);

  /**
   * Empieza a escuchar. `auto`: lo abrió la app sola (atajo o mantener apretado), no un toque
   * directo; si el navegador lo rechaza por falta de toque, queda esperando que toquen el micrófono
   * en vez de mostrar un error de permisos.
   */
  const start = useCallback((opts?: { auto?: boolean }) => {
    const auto = opts?.auto === true;
    const Ctor = getCtor();
    if (!Ctor) return fail("unsupported");
    const prev = recRef.current;
    recRef.current = null;
    prev?.abort();
    userStopRef.current = false;
    setError(null);
    setInterim("");
    setStatus("listening");
    try { navigator.vibrate?.(10); } catch { /* sin vibración */ }
    const since = Date.now();

    /** Error de un intento: decide qué mostrar. */
    function settle(code: string, attempt: number, micOpened: boolean) {
      recRef.current = null;
      if (PERMISSION_ERRORS.has(code)) {
        // Arranque automático sin toque: esperamos el toque en silencio
        if (auto && attempt === 0 && !micOpened) { setStatus("idle"); setInterim(""); return; }
        // Al reintentar tras un silencio algunos navegadores piden un toque nuevo: no es un problema de permisos
        if (attempt > 0) return fail("no-speech");
      }
      fail(code);
    }

    function listen(R: RecognizerCtor, attempt: number) {
      const rec = new R();
      rec.lang = speechLang();
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      const startedAt = Date.now();
      let finalText = "";
      let partial = "";
      let failed: string | null = null;
      let micOpened = false;
      const current = () => recRef.current === rec;

      rec.onaudiostart = () => { micOpened = true; };
      rec.onresult = (e) => {
        if (!current()) return;
        micOpened = true;
        partial = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript + " ";
          else partial += r[0].transcript;
        }
        setInterim((finalText + partial).trim());
      };
      rec.onerror = (e) => {
        if (!current() || e.error === "aborted") return;
        failed = e.error;
      };
      rec.onend = () => {
        if (!current()) return; // cancelado o reemplazado por otra sesión
        const text = (finalText + partial).trim();
        if (text) { recRef.current = null; setStatus("idle"); setInterim(""); onFinalRef.current(text); return; }
        if (failed && failed !== "no-speech") return settle(failed, attempt, micOpened);
        // No llegó a abrir el micrófono: quedó tomado (pasa en iPhone tras varias sesiones)
        if (!failed && !micOpened && Date.now() - startedAt < MIC_OPEN_GRACE_MS) { recRef.current = null; return fail("mic-busy"); }
        // Cortó por silencio: si la persona no tocó "Listo", seguimos escuchando un rato más
        if (!userStopRef.current && Date.now() - since < WAIT_FOR_SPEECH_MS) {
          // recRef sigue apuntando a `rec` durante la pausa: así cancel() o un start() nuevo la anulan
          setTimeout(() => {
            if (recRef.current !== rec) return;
            if (userStopRef.current) { recRef.current = null; fail("no-speech"); return; }
            listen(R, attempt + 1);
          }, 150);
          return;
        }
        recRef.current = null;
        fail("no-speech");
      };

      recRef.current = rec;
      try { rec.start(); } catch { if (current()) settle("not-allowed", attempt, false); }
    }

    listen(Ctor, 0);
  }, [fail]);

  const stop = useCallback(() => {
    userStopRef.current = true;
    recRef.current?.stop();
  }, []);

  const cancel = useCallback(() => {
    userStopRef.current = true;
    const rec = recRef.current;
    recRef.current = null;
    rec?.abort();
    setStatus("idle");
    setInterim("");
  }, []);

  // Al cerrar la app soltamos el micrófono. (No en "visibilitychange": algunos teléfonos ocultan
  // la página mientras muestran el aviso de permiso del micrófono y eso cortaba el dictado.)
  useEffect(() => {
    window.addEventListener("pagehide", cancel);
    return () => {
      window.removeEventListener("pagehide", cancel);
      const rec = recRef.current;
      recRef.current = null;
      rec?.abort();
    };
  }, [cancel]);

  return { status, interim, error, start, stop, cancel };
}
