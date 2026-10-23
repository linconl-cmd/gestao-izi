import { requireStoreId } from "@/core/application/authorization";
import { createSellerAction, setSellerActiveAction } from "@/presentation/actions/sellers";
import { Flash } from "@/presentation/components/layout/app-shell";
import { buttonClass, inputClass, linkButtonClass } from "@/presentation/components/shared/styles";
import { requireUser } from "@/presentation/lib/require-user";

export default async function SellersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ error, ok }, { container, user }] = await Promise.all([searchParams, requireUser("owner")]);
  const team = await container.repositories.profiles.listByStore(requireStoreId(user));
  const sellers = team.filter((p) => p.role === "seller");

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_20rem]">
      <section>
        <h1 className="mb-4 text-xl font-semibold">Vendedores</h1>
        <Flash error={error} ok={ok} />
        {sellers.length === 0 ? (
          <p className="text-zinc-500">Nenhum vendedor cadastrado.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded border border-zinc-200">
            {sellers.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="font-medium">{s.fullName}</p>
                  <p className="text-sm text-zinc-500">
                    {s.email} · {s.isActive ? "ativo" : "inativo"}
                  </p>
                </div>
                <form action={setSellerActiveAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="isActive" value={String(!s.isActive)} />
                  <button type="submit" className={linkButtonClass}>
                    {s.isActive ? "Desativar" : "Reativar"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-zinc-500">
          Desativar bloqueia o login no próximo refresh do token (até 1 h para sessões já abertas).
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Novo vendedor</h2>
        <form action={createSellerAction} className="flex flex-col gap-3">
          <input name="fullName" required placeholder="Nome" className={inputClass} />
          <input name="email" type="email" required placeholder="E-mail" className={inputClass} />
          <input name="password" type="password" required minLength={8} autoComplete="new-password"
            placeholder="Senha inicial (mín. 8)" className={inputClass} />
          <button type="submit" className={buttonClass}>Criar vendedor</button>
        </form>
      </section>
    </div>
  );
}
