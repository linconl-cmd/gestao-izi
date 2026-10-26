"use client";

import JsBarcode from "jsbarcode";
import { useEffect, useRef } from "react";
import { isValidEan13 } from "@/core/domain/services/ean13";

/** EAN-13 (códigos válidos de 13 dígitos) ou Code 128 em SVG vetorial (nítido em térmica 203 dpi e em jato de tinta). Escala para 100% do contêiner. */
export function BarcodeSvg({ value, showText = true }: { value: string; showText?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    try {
      JsBarcode(svg, value, {
        format: isValidEan13(value) ? "EAN13" : "CODE128",
        displayValue: showText,
        fontSize: 14,
        textMargin: 1,
        height: 40,
        width: 2,
        margin: 0,
        background: "transparent",
        lineColor: "#000",
      });
      const w = svg.getAttribute("width");
      const h = svg.getAttribute("height");
      if (w && h && !svg.getAttribute("viewBox")) svg.setAttribute("viewBox", `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    } catch {
      svg.replaceChildren();
    }
  }, [value, showText]);

  return <svg ref={ref} role="img" aria-label={`Código de barras ${value}`} className="size-full" />;
}
