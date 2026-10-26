import { redirect } from "next/navigation";
import { PosTerminal } from "@/presentation/components/pos/pos-terminal";
import { withFlash } from "@/presentation/lib/action-result";
import { loadPosCatalog } from "@/presentation/lib/pos-catalog";
import { requireUser } from "@/presentation/lib/require-user";

export default async function PosPage() {
  const { container, user } = await requireUser("owner", "manager", "seller");
  const catalog = await loadPosCatalog(container);

  // Vendedor monta a comanda e envia ao caixa: não precisa de caixa aberto.
  if (user.role === "seller") return <PosTerminal catalog={catalog} mode="order" />;

  // Dono/gerente: recebimento direto, no próprio caixa.
  const register = await container.repositories.cashRegisters.findOpenByUser(user.id);
  if (!register) redirect(withFlash("/pos/cash-register", "error", "Abra o caixa para começar a vender."));
  return <PosTerminal catalog={catalog} cashRegisterId={register.id} />;
}
