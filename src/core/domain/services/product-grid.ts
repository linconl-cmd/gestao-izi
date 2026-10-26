import { ValidationError } from "../errors/domain-error";

export const MAX_GRID_VARIANTS = 120;

/** "P, M; G\nGG" -> ["P","M","G","GG"] (sem repetição, ignorando maiúsculas). */
export function parseList(raw: string | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of (raw ?? "").split(/[,;\n]+/)) {
    const v = part.trim();
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(v);
  }
  return out;
}

export interface GridCombo {
  size: string | null;
  color: string | null;
}

/** Produto cartesiano tamanhos × cores; lista vazia vira uma única opção "sem valor". */
export function buildGrid(sizes: string[], colors: string[]): GridCombo[] {
  const s: (string | null)[] = sizes.length ? sizes : [null];
  const c: (string | null)[] = colors.length ? colors : [null];
  if (s.length * c.length > MAX_GRID_VARIANTS) {
    throw new ValidationError(`A grade gera ${s.length * c.length} variações; o máximo é ${MAX_GRID_VARIANTS}.`);
  }
  return s.flatMap((size) => c.map((color) => ({ size, color })));
}
