"use server";

import { z } from "zod";
import { parseForm } from "@/presentation/lib/form";
import { requireUser } from "@/presentation/lib/require-user";
import { runAction } from "@/presentation/lib/run-action";

const PATH = "/owner/sellers";

const createSellerSchema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome do vendedor."),
  email: z.email("E-mail inválido."),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
});

export async function createSellerAction(formData: FormData): Promise<void> {
  const d = parseForm(createSellerSchema, formData, PATH);
  await runAction(PATH, "Vendedor criado.", async () => {
    const { container, user } = await requireUser("owner", "manager");
    await container.useCases.createSeller.execute(user, d);
  });
}

export async function createManagerAction(formData: FormData): Promise<void> {
  const d = parseForm(createSellerSchema, formData, PATH);
  await runAction(PATH, "Gerente criado.", async () => {
    const { container, user } = await requireUser("owner");
    await container.useCases.createManager.execute(user, d);
  });
}

export async function setSellerActiveAction(formData: FormData): Promise<void> {
  const d = parseForm(z.object({ id: z.uuid(), isActive: z.enum(["true", "false"]) }), formData, PATH);
  await runAction(PATH, null, async () => {
    const { container } = await requireUser("owner", "manager");
    await container.repositories.profiles.setActive(d.id, d.isActive === "true");
  });
}
