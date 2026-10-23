/**
 * Classes compartilhadas para <input>/<select>/<button> nativos usados em formulários
 * server-rendered. Espelham os tokens do shadcn (Input/Button) para manter um visual só.
 */
export const inputClass =
  "h-11 w-full min-w-0 rounded-xl border border-input bg-transparent px-3.5 text-base outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:opacity-50 md:text-sm dark:bg-input/30";

export const buttonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50";

export const secondaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-card px-4 text-sm font-medium transition hover:bg-muted active:scale-[0.98]";

export const linkButtonClass =
  "inline-flex min-h-10 items-center text-sm font-medium text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline";

export const cardClass = "rounded-2xl border bg-card shadow-soft";
export const listClass = "divide-y divide-border overflow-hidden rounded-2xl border bg-card shadow-soft";
