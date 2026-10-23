"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { optionalText, parseForm } from "@/presentation/lib/form";
import { withFlash } from "@/presentation/lib/action-result";
import { requireUser } from "@/presentation/lib/require-user";
import { runAction } from "@/presentation/lib/run-action";
import { slugify } from "@/presentation/lib/slugify";

const PATH = "/master/stores";

const createStoreSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da loja."),
  slug: optionalText,
  document: optionalText,
  ownerName: z.string().trim().min(2, "Informe o nome do proprietário."),
  ownerEmail: z.email("E-mail do proprietário inválido."),
  ownerPassword: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
});

export async function createStoreAction(formData: FormData): Promise<void> {
  const d = parseForm(createStoreSchema, formData, PATH);
  const slug = slugify(d.slug ?? d.name);
  if (!slug) redirect(withFlash(PATH, "error", "Não foi possível gerar o identificador da loja."));

  await runAction(PATH, "Loja criada.", async () => {
    const { container, user } = await requireUser("master");
    await container.useCases.createStoreWithOwner.execute(user, {
      store: { name: d.name, slug, document: d.document },
      owner: { email: d.ownerEmail, password: d.ownerPassword, fullName: d.ownerName },
    });
  });
}

export async function setStoreActiveAction(formData: FormData): Promise<void> {
  const d = parseForm(z.object({ id: z.uuid(), isActive: z.enum(["true", "false"]) }), formData, PATH);
  await runAction(PATH, null, async () => {
    const { container } = await requireUser("master");
    await container.repositories.stores.update(d.id, { isActive: d.isActive === "true" });
  });
}
