import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { userMessage, withFlash } from "./action-result";

/** redirect() do Next lança um erro especial que não pode ser engolido pelo catch. */
export function isRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

/**
 * Executa o trabalho de uma Server Action e volta para `path` com mensagem flash.
 * `work` pode devolver o texto de sucesso; senão usa `okMessage`. Nunca retorna.
 */
export async function runAction(
  path: string,
  okMessage: string | null,
  work: () => Promise<void | string>,
  /** Destino do sucesso (padrão: a mesma página). */
  okPath?: string,
): Promise<never> {
  let failure: string | null = null;
  let message = okMessage;
  try {
    message = (await work()) ?? okMessage;
  } catch (error) {
    if (isRedirect(error)) throw error;
    failure = userMessage(error);
  }
  if (failure) redirect(withFlash(path, "error", failure));
  // Menu, contador de comandas e alertas moram no layout: revalida tudo.
  revalidatePath("/", "layout");
  const target = okPath ?? path;
  redirect(message ? withFlash(target, "ok", message) : target);
}
