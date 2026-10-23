import { redirect } from "next/navigation";
import { getContainer } from "@/infra/di/server";
import { homeFor, LOGIN_PATH } from "@/presentation/lib/routes";

export default async function RootPage() {
  const { session } = await getContainer();
  const user = await session.getCurrentUser();
  redirect(user ? homeFor(user.role) : LOGIN_PATH);
}
