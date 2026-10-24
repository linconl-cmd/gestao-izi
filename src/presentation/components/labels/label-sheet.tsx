"use client";

import type { PosVariant } from "@/presentation/lib/pos-types";
import { labelsPerPage, type LabelLayout, type LabelPreset } from "@/presentation/lib/label-presets";
import { LabelCell, type LabelOptions } from "./label-cell";

/** `null` = posição pulada (folha parcialmente usada). */
export type LabelSlot = PosVariant | null;

/**
 * Folhas na escala real (mm). A prévia usa `zoom`; na impressão o zoom volta a 1 e
 * cada página tem tamanho e quebra exatos, com @page ajustado ao papel/rolo escolhido.
 */
export function LabelSheet({
  slots,
  layout,
  kind,
  options,
  zoom,
}: {
  slots: LabelSlot[];
  layout: LabelLayout;
  kind: LabelPreset["kind"];
  options: LabelOptions;
  zoom: number;
}) {
  const perPage = labelsPerPage(layout, kind);
  const pages: LabelSlot[][] = [];
  for (let i = 0; i < slots.length; i += perPage) pages.push(slots.slice(i, i + perPage));

  return (
    <>
      <style>{`@media print { @page { size: ${layout.pageWidthMm}mm ${layout.pageHeightMm}mm; margin: 0; } html, body { background: #fff !important; } }`}</style>
      <div id="label-sheets" className="flex flex-col items-start gap-6 [zoom:var(--label-zoom)] print:block print:gap-0 print:[zoom:1]"
        style={{ ["--label-zoom" as string]: zoom }}
      >
        {pages.map((page, p) => (
          <section
            key={p}
            aria-label={`Página ${p + 1}`}
            className="relative box-border shrink-0 bg-white text-black shadow-soft ring-1 ring-black/10 print:break-after-page print:shadow-none print:ring-0 last:print:break-after-auto"
            style={{
              width: `${layout.pageWidthMm}mm`,
              height: `${layout.pageHeightMm}mm`,
              paddingTop: `${layout.marginTopMm}mm`,
              paddingLeft: `${layout.marginLeftMm}mm`,
              overflow: "hidden",
            }}
          >
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${layout.columns}, ${layout.widthMm}mm)`,
                gridAutoRows: `${layout.heightMm}mm`,
                columnGap: `${layout.gapXMm}mm`,
                rowGap: `${layout.gapYMm}mm`,
              }}
            >
              {page.map((slot, i) => (
                <div key={i} className="outline outline-1 -outline-offset-1 outline-dashed outline-black/15 print:outline-none">
                  {slot && <LabelCell variant={slot} widthMm={layout.widthMm} heightMm={layout.heightMm} options={options} />}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
