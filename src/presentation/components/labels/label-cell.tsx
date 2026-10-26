"use client";

import { QRCodeSVG } from "qrcode.react";
import { brl, type PosVariant, variantLabel } from "@/presentation/lib/pos-types";
import { BarcodeSvg } from "./barcode-svg";

export interface LabelOptions {
  showName: boolean;
  /** SKU em texto legível (independe do tipo de código). */
  showSku: boolean;
  showPrice: boolean;
  code: "barcode" | "qr" | "none";
  showCodeText: boolean;
}

/** Valor codificado: código de barras do produto, ou o SKU como alternativa. */
export const codeOf = (v: PosVariant) => v.barcode ?? v.sku;

/** Parcela da largura da etiqueta dada ao código de barras quando ele fica ao lado do texto. */
export const BARCODE_WIDTH_SHARE = 0.5;

/**
 * Largura estimada de cada barra mais fina (mm) em Code 128. Números usam o subconjunto C
 * (2 dígitos por símbolo). Abaixo de ~0,17 mm (≈1,3 ponto a 203 dpi) leitores falham.
 */
export function estimateModuleMm(value: string, widthMm: number, heightMm: number): number {
  const numeric = /^\d+$/.test(value);
  const symbols = numeric ? Math.ceil(value.length / 2) + (value.length % 2 ? 1 : 0) : value.length;
  const modules = (symbols + 3) * 11 + 2;
  const wide = widthMm / heightMm > 1.4;
  const boxMm = (wide ? widthMm * BARCODE_WIDTH_SHARE : widthMm) - 2.4;
  return boxMm / modules;
}

/** Uma etiqueta. Fontes e áreas escalam pela altura; etiquetas largas colocam o código ao lado do texto. */
export function LabelCell({
  variant,
  widthMm,
  heightMm,
  options,
}: {
  variant: PosVariant;
  widthMm: number;
  heightMm: number;
  options: LabelOptions;
}) {
  const s = Math.min(heightMm / 30, widthMm / 50 + 0.2);
  const pt = (base: number, min: number) => `${Math.max(min, base * s).toFixed(1)}pt`;
  // Texto à esquerda e código à direita em qualquer etiqueta retangular; só as quase quadradas empilham.
  const wide = widthMm / heightMm > 1.4;
  const hasCode = options.code !== "none";
  const qrMm = wide ? Math.min(heightMm * 0.78, widthMm * 0.36) : heightMm * 0.5;
  const label = variantLabel(variant);

  const text = (
    <div className="flex min-w-0 flex-1 flex-col justify-between leading-tight">
      <div className="min-w-0">
        {options.showName && (
          <p className="line-clamp-2 font-medium" style={{ fontSize: pt(7, 5) }}>{variant.productName}</p>
        )}
        {label && <p className="font-bold" style={{ fontSize: pt(9, 6) }}>{label}</p>}
        {options.showSku && (
          <p className="break-all font-mono" style={{ fontSize: pt(5.5, 4) }}>SKU {variant.sku}</p>
        )}
      </div>
      {options.showPrice && (
        <p className="font-extrabold tabular-nums" style={{ fontSize: pt(13, 8) }}>{brl(variant.priceCents)}</p>
      )}
    </div>
  );

  const code = !hasCode ? null : options.code === "qr" ? (
    <div className="grid shrink-0 place-items-center" style={{ width: `${qrMm}mm`, height: `${qrMm}mm` }}>
      <QRCodeSVG value={codeOf(variant)} level="M" marginSize={0} className="size-full" />
    </div>
  ) : (
    <div className="shrink-0" style={wide ? { width: `${BARCODE_WIDTH_SHARE * 100}%`, height: "100%" } : { width: "100%", height: `${heightMm * 0.36}mm` }}>
      <BarcodeSvg value={codeOf(variant)} showText={options.showCodeText} />
    </div>
  );

  return (
    <div
      className={`box-border flex overflow-hidden bg-white p-[1.2mm] text-black ${wide ? "flex-row items-center gap-[1.5mm]" : "flex-col gap-[0.8mm]"}`}
      style={{ width: `${widthMm}mm`, height: `${heightMm}mm` }}
    >
      {text}
      {code}
    </div>
  );
}
