"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Flashlight, FlashlightOff, SwitchCamera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/presentation/components/ui/button";
import { cn } from "@/presentation/lib/utils";

const REPEAT_WINDOW_MS = 1500;

export interface ScanOutcome {
  /** Muda a cada leitura para reiniciar a animação. */
  id: number;
  kind: "success" | "error";
  text: string;
}

/** `torch` ainda não está nos tipos DOM do TypeScript. */
type TorchCapable = { getCapabilities?: () => { torch?: boolean } };

/**
 * Leitor de QR/códigos de barras (zxing) com viewfinder centralizado, lanterna e troca de câmera.
 * Exige HTTPS ou localhost. Leitura contínua: o pai decide o que fazer a cada código.
 */
export function BarcodeScanner({
  onDetect,
  onClose,
  outcome,
  className,
}: {
  onDetect: (code: string) => void;
  onClose: () => void;
  outcome: ScanOutcome | null;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectRef = useRef(onDetect);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    let last = { code: "", at: 0 };
    setError(null);
    setTorchOn(false);
    setTorchSupported(false);

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } } },
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
        if (cancelled) {
          controls.stop();
          return;
        }
        stop = () => controls.stop();
        const stream = videoRef.current?.srcObject;
        const track = stream instanceof MediaStream ? (stream.getVideoTracks()[0] as unknown as TorchCapable | undefined) : undefined;
        setTorchSupported(Boolean(track?.getCapabilities?.().torch));
      } catch {
        setError("Não foi possível acessar a câmera. Libere a permissão no navegador e tente de novo.");
      }
    })();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [facing]);

  async function toggleTorch() {
    const stream = videoRef.current?.srcObject;
    const track = stream instanceof MediaStream ? stream.getVideoTracks()[0] : undefined;
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }

  return (
    <div className={cn("relative isolate flex flex-col overflow-hidden bg-black text-white", className)}>
      {error ? (
        <div role="alert" className="grid flex-1 place-items-center p-8 text-center text-sm">
          <div className="space-y-4">
            <p>{error}</p>
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      ) : (
        <>
          <video ref={videoRef} className="absolute inset-0 size-full object-cover" muted playsInline autoPlay />

          {/* Máscara + moldura: guia o vendedor a centralizar a etiqueta */}
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div
              className="relative aspect-square w-[68%] max-w-72 rounded-3xl shadow-[0_0_0_100vmax_rgba(0,0,0,0.58)]"
              style={{ ["--scan-range" as string]: "min(15rem, 56vw)" }}
            >
              {(["top-0 left-0 border-t-4 border-l-4 rounded-tl-3xl", "top-0 right-0 border-t-4 border-r-4 rounded-tr-3xl",
                "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl"] as const).map((pos) => (
                <span key={pos} className={cn("absolute size-9 border-white/90 transition-colors", pos,
                  outcome?.kind === "success" && "border-emerald-400", outcome?.kind === "error" && "border-red-400")} />
              ))}
              <span className="animate-scan-line absolute inset-x-4 top-3 h-0.5 rounded-full bg-primary shadow-[0_0_12px_2px] shadow-primary" />

              <AnimatePresence>
                {outcome?.kind === "success" && (
                  <motion.span
                    key={outcome.id}
                    initial={{ opacity: 0.9, scale: 0.9 }}
                    animate={{ opacity: 0, scale: 1.06 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 grid place-items-center rounded-3xl bg-emerald-400/30"
                  >
                    <Check className="size-16 text-white" strokeWidth={3} />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Controles */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <Button variant="secondary" size="icon-lg" className="bg-black/50 text-white backdrop-blur hover:bg-black/70" onClick={onClose} aria-label="Fechar câmera">
              <X className="size-6" />
            </Button>
            <div className="flex gap-2">
              {torchSupported && (
                <Button variant="secondary" size="icon-lg" aria-pressed={torchOn} aria-label="Lanterna"
                  className={cn("bg-black/50 text-white backdrop-blur hover:bg-black/70", torchOn && "bg-amber-400 text-black hover:bg-amber-300")}
                  onClick={toggleTorch}>
                  {torchOn ? <Flashlight className="size-6" /> : <FlashlightOff className="size-6" />}
                </Button>
              )}
              <Button variant="secondary" size="icon-lg" className="bg-black/50 text-white backdrop-blur hover:bg-black/70"
                onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))} aria-label="Alternar câmera">
                <SwitchCamera className="size-6" />
              </Button>
            </div>
          </div>

          {/* Resultado da última leitura + dica */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <AnimatePresence mode="wait">
              {outcome && (
                <motion.p
                  key={outcome.id}
                  role="status"
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -8, opacity: 0 }}
                  className={cn("max-w-full truncate rounded-full px-4 py-2 text-sm font-medium backdrop-blur",
                    outcome.kind === "success" ? "bg-emerald-500/90" : "bg-red-500/90")}
                >
                  {outcome.text}
                </motion.p>
              )}
            </AnimatePresence>
            <p className="text-xs text-white/70">Aponte para o QR Code ou código de barras da etiqueta</p>
          </div>
        </>
      )}
    </div>
  );
}
