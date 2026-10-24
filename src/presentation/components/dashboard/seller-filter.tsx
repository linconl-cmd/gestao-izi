"use client";

import { usePathname, useRouter } from "next/navigation";
import { inputClass } from "@/presentation/components/shared/styles";

/** Filtro por vendedor via query string (?seller=ID): a página recarrega no servidor. */
export function SellerFilter({ sellers, value }: { sellers: { id: string; name: string }[]; value: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <select
      aria-label="Filtrar por vendedor"
      value={value}
      onChange={(e) => router.push(e.target.value ? `${pathname}?seller=${e.target.value}` : pathname)}
      className={`${inputClass} w-auto min-w-44`}
    >
      <option value="">Todos os vendedores</option>
      {sellers.map((s) => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  );
}
