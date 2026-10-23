import { z } from "zod";

const publicSchema = z.object({
  url: z.url(),
  anonKey: z.string().min(1),
});

/** Variáveis NEXT_PUBLIC_* precisam de acesso literal para o bundler inlinar no browser. */
export function getPublicEnv() {
  return publicSchema.parse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export function getServiceRoleKey(): string {
  return z.string().min(1).parse(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
