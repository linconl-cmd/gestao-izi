/** Geometria de etiqueta/folha, tudo em milímetros. */
export interface LabelLayout {
  /** Tamanho de uma etiqueta. */
  widthMm: number;
  heightMm: number;
  /** Tamanho da página impressa. Em térmica = tamanho da etiqueta (1 etiqueta por página). */
  pageWidthMm: number;
  pageHeightMm: number;
  columns: number;
  rows: number;
  marginTopMm: number;
  marginLeftMm: number;
  gapXMm: number;
  gapYMm: number;
}

export interface LabelPreset {
  id: string;
  name: string;
  hint: string;
  kind: "thermal" | "sheet";
  layout: LabelLayout;
}

const thermal = (w: number, h: number): LabelLayout => ({
  widthMm: w,
  heightMm: h,
  pageWidthMm: w,
  pageHeightMm: h,
  columns: 1,
  rows: 1,
  marginTopMm: 0,
  marginLeftMm: 0,
  gapXMm: 0,
  gapYMm: 0,
});

export const LABEL_PRESETS: readonly LabelPreset[] = [
  { id: "thermal-50x30", name: "Térmica 50 × 30 mm", hint: "Zebra, Elgin, Argox — rolo", kind: "thermal", layout: thermal(50, 30) },
  { id: "thermal-40x25", name: "Térmica 40 × 25 mm", hint: "Rolo pequeno (joias, bijuteria)", kind: "thermal", layout: thermal(40, 25) },
  { id: "thermal-60x40", name: "Térmica 60 × 40 mm", hint: "Rolo grande (cabide, caixa)", kind: "thermal", layout: thermal(60, 40) },
  {
    id: "pimaco-6180",
    name: "Pimaco 6180 · 3 × 10",
    hint: "66,7 × 25,4 mm · folha Carta",
    kind: "sheet",
    layout: {
      widthMm: 66.7, heightMm: 25.4, pageWidthMm: 215.9, pageHeightMm: 279.4,
      columns: 3, rows: 10, marginTopMm: 12.7, marginLeftMm: 4.7, gapXMm: 0, gapYMm: 0,
    },
  },
  {
    id: "a4-3x8",
    name: "A4 · 3 × 8",
    hint: "70 × 37 mm · folha A4 adesiva",
    kind: "sheet",
    layout: {
      widthMm: 70, heightMm: 37, pageWidthMm: 210, pageHeightMm: 297,
      columns: 3, rows: 8, marginTopMm: 0.5, marginLeftMm: 0, gapXMm: 0, gapYMm: 0,
    },
  },
] as const;

export function labelsPerPage(layout: LabelLayout, kind: LabelPreset["kind"]): number {
  return kind === "thermal" ? 1 : Math.max(1, layout.columns * layout.rows);
}
