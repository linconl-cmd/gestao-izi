"use client";

import { useEffect, useRef, useState } from "react";

const REPEAT_WINDOW_MS = 1500;

/** Lê QR/códigos de barras pela câmera (zxing). Exige HTTPS ou localhost. */
export function BarcodeScanner({
  onDetect,
  onClose,
}: {
  onDetect: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectRef = useRef(onDetect);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    let last = { code: "", at: 0 };

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current ?? undefined,
          (result) => {
            if (!result) return;
            const code = result.getText();
            const now = Date.now();
            if (code === last.code && now - last.at < REPEAT_WINDOW_MS) return;
            last = { code, at: now };
            onDetectRef.current(code);
          },
        );
        if (cancelled) controls.stop();
        else stop = () => controls.stop();
      } catch {
        setError("Não foi possível acessar a câmera. Verifique a permissão do navegador.");
      }
    })();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);

  return (
    <div className="rounded border border-zinc-300 p-2">
      {error ? (
        <p role="alert" className="p-4 text-sm text-red-600">{error}</p>
      ) : (
        <video ref={videoRef} className="aspect-video w-full rounded bg-black object-cover" muted playsInline />
      )}
      <button type="button" onClick={onClose} className="mt-2 text-sm text-zinc-600 underline">
        Fechar câmera
      </button>
    </div>
  );
}
