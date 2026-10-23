import { DomainError } from "@/core/domain/errors/domain-error";

/** Mensagem segura para a UI; detalhes de infraestrutura não vazam para o usuário. */
export function userMessage(error: unknown): string {
  if (error instanceof DomainError && error.code !== "INFRASTRUCTURE") return error.message;
  return "Não foi possível concluir a operação. Tente novamente.";
}

export function withFlash(path: string, kind: "error" | "ok", message: string): string {
  return `${path}?${kind}=${encodeURIComponent(message)}`;
}
