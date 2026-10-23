"use client";

import { useEffect, useRef } from "react";

export interface PosShortcuts {
  /** F2 */
  focusSearch: () => void;
  /** Espaço (fora de campos de texto) */
  toggleScanner: () => void;
  /** Enter (fora de campos) ou Ctrl+Enter (em qualquer lugar) */
  finalize: () => void;
}

const TEXT_FIELDS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isInteractive(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return TEXT_FIELDS.has(el.tagName) || el.tagName === "BUTTON" || el.tagName === "A" || el.isContentEditable;
}

/** Atalhos de teclado do PDV. Ignora quando um diálogo está aberto (`enabled=false`). */
export function usePosShortcuts(handlers: PosShortcuts, enabled = true): void {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "F2") {
        e.preventDefault();
        ref.current.focusSearch();
      } else if (e.key === "Enter" && e.ctrlKey) {
        e.preventDefault();
        ref.current.finalize();
      } else if (e.key === "Enter" && !isInteractive(e.target)) {
        e.preventDefault();
        ref.current.finalize();
      } else if (e.key === " " && !isInteractive(e.target)) {
        e.preventDefault();
        ref.current.toggleScanner();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
