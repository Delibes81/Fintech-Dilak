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
/** Silencio después de hablar que da la frase por terminada (Safari en iPhone no corta solo). */
const END_OF_SPEECH_MS = 1_300;
/** Sin ninguna palabra en este tiempo: ofrecemos dictar con el teclado. */
const STALL_HINT_MS = 5_000;
/** Sin ninguna palabra en este tiempo: el reconocimiento quedó trabado, lo decimos. */
const STALL_FAIL_MS = 12_000;
/** Tras tocar "Listo" sin texto, cuánto esperamos a que el navegador termine. */
const STOP_GRACE_MS = 1_200;

export const isIOS = () =>
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
    case "stuck": return isIOS()
      ? "El iPhone dejó de pasarle tu voz a Dilak (pasa en la app instalada). Usá el dictado del teclado, o cerrá Dilak desde el selector de apps y volvé a abrirla."
      : "No llegó ninguna palabra. Usá el dictado del teclado o tocá el micrófono para intentar de nuevo.";
    case "no-speech": return "No te escuché. Tocá el micrófono y hablá cerca del teléfono.";
    case "audio-capture":
    case "mic-busy": return "El micrófono quedó ocupado. Tocá el botón para reintentar; si sigue, cerrá Dilak por completo y volvé a abrirla, o usá el micrófono del teclado.";
    case "network": return "El reconocimiento de voz necesita internet. Revisá la conexión.";
    case "unsupported": return "Este navegador no reconoce voz.";
    default: return code ? "No pudimos escucharte. Probá de nuevo." : null;
  }
}

interface Session { heard: () => string; finish: () => void; end: () => void; stop: () => void }

/**
 * Corta un reconocedor con suavidad. Nunca `abort()`: en el iPhone (app instalada), abortar una
 * escucha activa deja el reconocimiento trabado y las siguientes "escuchan" sin recibir audio.
 * Sus eventos posteriores se ignoran porque ya no es el reconocedor actual.
 */
function release(rec: Recognizer | null) {
  if (!rec) return;
  try { rec.stop(); } catch { /* ya había terminado */ }
}

/**
 * Reconocimiento de voz de una frase: escucha, muestra la transcripción parcial en vivo
 * y entrega el texto final a `onFinal` cuando la persona deja de hablar.
 *
 * Robustez para teléfonos reales:
 * - Cada sesión ignora los eventos de reconocedores viejos (un `onend` tardío no pisa al nuevo).
 * - Si el reconocedor corta sin marcar el texto como final, usa lo último que se oyó.
 * - Si corta por silencio antes de que la persona hable, vuelve a escuchar solo (hasta 10 s).
 * - Si la persona ya habló y se queda callada 1,3 s, entrega la frase en el acto (Safari no corta solo).
 * - Corta con stop(), nunca abort() (en el iPhone eso trababa los dictados siguientes).
 * - Si no llega ninguna palabra, avisa (`stalled` a los 5 s, error "stuck" a los 12 s) en vez de
 *   quedarse en "Te escucho…" para siempre.
 */
export function useSpeech(onFinal: (text: string) => void) {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stalled, setStalled] = useState(false);
  const recRef = useRef<Recognizer | null>(null);
  const userStopRef = useRef(false);
  /** Sesión en curso: lo que se oyó y cómo terminarla (lo usa "Listo"). */
  const sessionRef = useRef<Session | null>(null);
  const onFinalRef = useRef(onFinal);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);

  const fail = useCallback((code: string) => {
    sessionRef.current?.end();
    sessionRef.current = null;
    setError(code); setStatus("error"); setInterim(""); setStalled(false);
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
    sessionRef.current?.end();
    const prev = recRef.current;
    recRef.current = null;
    release(prev);
    userStopRef.current = false;
    setError(null);
    setInterim("");
    setStalled(false);
    setStatus("listening");
    try { navigator.vibrate?.(10); } catch { /* sin vibración */ }
    const since = Date.now();
    let heardAny = false;
    let heardText = "";

    // Vigía de la sesión: si no llega ninguna palabra, primero ofrece el teclado y después avisa
    const hintTimer = setTimeout(() => { if (!heardAny) setStalled(true); }, STALL_HINT_MS);
    const failTimer = setTimeout(() => {
      if (heardAny || userStopRef.current) return;
      const rec = recRef.current;
      recRef.current = null;
      release(rec);
      fail("stuck");
    }, STALL_FAIL_MS);
    let graceTimer: ReturnType<typeof setTimeout> | undefined;

    /** Termina la sesión entregando el texto (o "no te escuché"). */
    function finishWith(text: string) {
      session.end();
      const rec = recRef.current;
      recRef.current = null;
      release(rec);
      if (text) { setStatus("idle"); setInterim(""); setStalled(false); onFinalRef.current(text); }
      else fail("no-speech");
    }
    const session: Session = {
      heard: () => heardText,
      finish: () => finishWith(heardText),
      end: () => { clearTimeout(hintTimer); clearTimeout(failTimer); clearTimeout(graceTimer); if (sessionRef.current === session) sessionRef.current = null; },
      /** "Listo": si ya dijo algo, se entrega al toque; si no, se espera un instante al navegador. */
      stop: () => {
        if (heardText) return finishWith(heardText);
        try { recRef.current?.stop(); } catch { /* ya cortaba */ }
        graceTimer = setTimeout(() => { if (sessionRef.current === session) finishWith(heardText); }, STOP_GRACE_MS);
      },
    };
    sessionRef.current = session;

    /** Error de un intento: decide qué mostrar. */
    function settle(code: string, attempt: number, micOpened: boolean) {
      recRef.current = null;
      if (PERMISSION_ERRORS.has(code)) {
        // Arranque automático sin toque: esperamos el toque en silencio
        if (auto && attempt === 0 && !micOpened) { session.end(); setStatus("idle"); setInterim(""); setStalled(false); return; }
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
      let silenceTimer: ReturnType<typeof setTimeout> | undefined;
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
        heardText = (finalText + partial).trim();
        if (heardText && !heardAny) { heardAny = true; setStalled(false); }
        setInterim(heardText);
        // Cada palabra nueva reinicia la espera; tras un silencio corto, la frase está lista
        clearTimeout(silenceTimer);
        if (heardText) silenceTimer = setTimeout(() => { if (current()) finishWith(heardText); }, END_OF_SPEECH_MS);
      };
      rec.onerror = (e) => {
        if (!current() || e.error === "aborted") return;
        failed = e.error;
      };
      rec.onend = () => {
        clearTimeout(silenceTimer);
        if (!current()) return; // cancelado o reemplazado por otra sesión
        heardText = (finalText + partial).trim() || heardText;
        if (heardText) return finishWith(heardText);
        if (failed && failed !== "no-speech") return settle(failed, attempt, micOpened);
        // No llegó a abrir el micrófono: quedó tomado (pasa en iPhone tras varias sesiones)
        if (!failed && !micOpened && Date.now() - startedAt < MIC_OPEN_GRACE_MS) { recRef.current = null; return fail("mic-busy"); }
        // Cortó por silencio: si la persona no tocó "Listo", seguimos escuchando un rato más
        if (!userStopRef.current && Date.now() - since < WAIT_FOR_SPEECH_MS) {
          // recRef sigue apuntando a `rec` durante la pausa: así cancel() o un start() nuevo la anulan
          setTimeout(() => {
            if (recRef.current !== rec) return;
            if (userStopRef.current) return finishWith("");
            listen(R, attempt + 1);
          }, 150);
          return;
        }
        finishWith("");
      };

      recRef.current = rec;
      try { rec.start(); } catch { if (current()) settle("not-allowed", attempt, false); }
    }

    listen(Ctor, 0);
  }, [fail]);

  /** "Listo": entrega lo que se oyó sin esperar al navegador. */
  const stop = useCallback(() => {
    userStopRef.current = true;
    if (sessionRef.current) sessionRef.current.stop();
    else release(recRef.current);
  }, []);

  /** Cancela sin entregar nada (cerrar la hoja, cambiar a teclado). */
  const cancel = useCallback(() => {
    userStopRef.current = true;
    sessionRef.current?.end();
    sessionRef.current = null;
    const rec = recRef.current;
    recRef.current = null;
    release(rec);
    setStatus("idle");
    setInterim("");
    setStalled(false);
  }, []);

  // Al cerrar la app soltamos el micrófono. (No en "visibilitychange": algunos teléfonos ocultan
  // la página mientras muestran el aviso de permiso del micrófono y eso cortaba el dictado.)
  useEffect(() => {
    window.addEventListener("pagehide", cancel);
    return () => {
      window.removeEventListener("pagehide", cancel);
      const rec = recRef.current;
      recRef.current = null;
      release(rec);
    };
  }, [cancel]);

  return { status, interim, error, stalled, start, stop, cancel };
}
