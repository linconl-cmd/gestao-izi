"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infra/supabase/clients/server";
import { SupabaseSessionProvider } from "@/infra/supabase/session-provider";
import { homeFor, LOGIN_PATH } from "@/presentation/lib/routes";

const credentials = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function signInAction(formData: FormData): Promise<void> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect(`${LOGIN_PATH}?error=invalid`);

  const db = await createSupabaseServerClient();
  const { error } = await db.auth.signInWithPassword(parsed.data);
  if (error) redirect(`${LOGIN_PATH}?error=credentials`);

  const user = await new SupabaseSessionProvider(db).getCurrentUser();
  // Conta sem role/loja provisionada: encerra a sessão em vez de deixá-la num limbo.
  if (!user) {
    await db.auth.signOut();
    redirect(`${LOGIN_PATH}?error=unprovisioned`);
  }
  redirect(homeFor(user.role));
}

export async function signOutAction(): Promise<void> {
  const db = await createSupabaseServerClient();
  await db.auth.signOut();
  redirect(LOGIN_PATH);
}
