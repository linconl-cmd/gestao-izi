import { redirect } from "next/navigation";
import { PosTerminal } from "@/presentation/components/pos/pos-terminal";
import { loadPosCatalog } from "@/presentation/lib/pos-catalog";
import { requireUser } from "@/presentation/lib/require-user";
import { withFlash } from "@/presentation/lib/action-result";

export default async function PosPage() {
  const { container, user } = await requireUser("owner", "seller");
  const register = await container.repositories.cashRegisters.findOpenByUser(user.id);
  if (!register) redirect(withFlash("/pos/cash-register", "error", "Abra o caixa para começar a vender."));

  const catalog = await loadPosCatalog(container);
  return <PosTerminal catalog={catalog} cashRegisterId={register.id} />;
}
