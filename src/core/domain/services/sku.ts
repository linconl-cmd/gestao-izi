const clean = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Base legível do SKU: 3 letras do nome + tamanho + 3 letras da cor (ex.: CAM-M-AZU). */
export function skuBase(name: string, size?: string | null, color?: string | null): string {
  const firstWord = name.trim().split(/\s+/)[0] ?? "";
  const parts = [clean(firstWord).slice(0, 3) || "PRD", clean(size ?? ""), clean(color ?? "").slice(0, 3)];
  return parts.filter(Boolean).join("-");
}

/** Prefixo de busca dos SKUs de um produto (as 3 letras do nome). */
export const skuPrefix = (name: string): string => skuBase(name);

/** Primeiro SKU livre a partir da base: CAM-M-AZU, CAM-M-AZU-2, CAM-M-AZU-3… */
export function nextFreeSku(base: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map((s) => s.toUpperCase()));
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}
