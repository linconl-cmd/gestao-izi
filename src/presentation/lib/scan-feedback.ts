"use client";

export type FeedbackKind = "success" | "error";

let audio: AudioContext | null = null;

function beep(kind: FeedbackKind): void {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = kind === "success" ? 1040 : 220;
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, audio.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + (kind === "success" ? 0.12 : 0.28));
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.3);
  } catch {
    /* sem áudio: segue só com vibração/visual */
  }
}

/** Vibração + bip curtos ao bipar. Silenciosamente ignorado onde não houver suporte (ex.: iOS vibra nada). */
export function scanFeedback(kind: FeedbackKind): void {
  try {
    navigator.vibrate?.(kind === "success" ? 40 : [60, 40, 60]);
  } catch {
    /* ignore */
  }
  beep(kind);
}
