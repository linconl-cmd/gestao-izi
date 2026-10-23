import type { PostgrestError } from "@supabase/supabase-js";
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  InfrastructureError,
  InsufficientStockError,
  ValidationError,
} from "@/core/domain/errors/domain-error";

/** Traduz erros do PostgREST/Postgres/triggers para erros de domínio. */
export function toDomainError(error: PostgrestError): DomainError {
  const msg = error.message ?? "";
  switch (error.code) {
    case "42501": // RLS ou trigger de privilégio
      return new ForbiddenError(msg);
    case "P0001": // RAISE EXCEPTION dos triggers
      return /insufficient stock/i.test(msg) ? new InsufficientStockError(msg) : new ValidationError(msg);
    case "23505":
      return new ConflictError("Record already exists");
    case "23503":
      return new ConflictError("Record is referenced by other data or does not exist");
    case "23514":
    case "22P02":
      return new ValidationError(msg);
    default:
      return new InfrastructureError(msg || "Database error");
  }
}

export function assertNoError(error: PostgrestError | null): void {
  if (error) throw toDomainError(error);
}

/** Linha única esperada; sob RLS "0 linhas" também significa sem permissão. */
export function requireRow<T>(data: T | null, error: PostgrestError | null, entity: string): T {
  assertNoError(error);
  if (data === null) throw new DomainError(`${entity} not found or not accessible`, "NOT_FOUND");
  return data;
}
