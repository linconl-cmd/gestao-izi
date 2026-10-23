import "server-only";
import { createSupabaseAdminClient } from "@/infra/supabase/clients/admin";
import { createSupabaseServerClient } from "@/infra/supabase/clients/server";
import { buildContainer, type Container } from "./container";

/** Um container por request (usa os cookies do usuário atual). */
export async function getContainer(): Promise<Container> {
  return buildContainer(await createSupabaseServerClient(), createSupabaseAdminClient);
}
