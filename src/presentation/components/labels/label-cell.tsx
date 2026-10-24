"use client";

import { QRCodeSVG } from "qrcode.react";
import { brl, type PosVariant, variantLabel } from "@/presentation/lib/pos-types";
import { BarcodeSvg } from "./barcode-svg";

export interface LabelOptions {
  showName: boolean;
  showPrice: boolean;
  code: "barcode" | "qr" | "none";
  showCodeText: boolean;
}

/** Valor codificado: código de barras do produto, ou o SKU como alternativa. */
export const codeOf = (v: PosVariant) => v.barcode ?? v.sku;

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
  const wide = widthMm / heightMm > 2;
  const hasCode = options.code !== "none";
  const label = variantLabel(variant);

  const text = (
    <div className="flex min-w-0 flex-1 flex-col justify-between leading-tight">
      <div className="min-w-0">
        {options.showName && (
          <p className="line-clamp-2 font-medium" style={{ fontSize: pt(7, 5) }}>{variant.productName}</p>
        )}
        {label && <p className="font-bold" style={{ fontSize: pt(9, 6) }}>{label}</p>}
      </div>
      {options.showPrice && (
        <p className="font-extrabold tabular-nums" style={{ fontSize: pt(13, 8) }}>{brl(variant.priceCents)}</p>
      )}
    </div>
  );

  const code = !hasCode ? null : options.code === "qr" ? (
    <div className="grid shrink-0 place-items-center" style={{ width: `${heightMm * (wide ? 0.78 : 0.5)}mm`, height: `${heightMm * (wide ? 0.78 : 0.5)}mm` }}>
      <QRCodeSVG value={codeOf(variant)} level="M" marginSize={0} className="size-full" />
    </div>
  ) : (
    <div className="shrink-0" style={wide ? { width: "42%", height: "100%" } : { width: "100%", height: `${heightMm * 0.36}mm` }}>
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
