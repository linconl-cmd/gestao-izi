/** Brasília não tem horário de verão desde 2019: UTC-3 fixo. */
export const BRASILIA_OFFSET_MINUTES = -180;

export interface DateRange {
  from: Date;
  to: Date;
}

const MINUTE = 60_000;

/** Dia civil (no fuso informado) que contém `now`, de 00:00:00.000 a 23:59:59.999. */
export function dayRange(now: Date, offsetMinutes = BRASILIA_OFFSET_MINUTES): DateRange {
  const local = new Date(now.getTime() + offsetMinutes * MINUTE);
  const start = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offsetMinutes * MINUTE;
  return { from: new Date(start), to: new Date(start + 24 * 60 * MINUTE - 1) };
}

/** Mês civil (no fuso informado) que contém `now`. */
export function monthRange(now: Date, offsetMinutes = BRASILIA_OFFSET_MINUTES): DateRange {
  const local = new Date(now.getTime() + offsetMinutes * MINUTE);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  return {
    from: new Date(Date.UTC(y, m, 1) - offsetMinutes * MINUTE),
    to: new Date(Date.UTC(y, m + 1, 1) - offsetMinutes * MINUTE - 1),
  };
}
