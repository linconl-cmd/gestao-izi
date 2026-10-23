import { createStoreAction, setStoreActiveAction } from "@/presentation/actions/stores";
import { Flash } from "@/presentation/components/layout/app-shell";
import { requireUser } from "@/presentation/lib/require-user";

const input = "rounded border border-zinc-300 px-3 py-2";

export default async function MasterStoresPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [{ error, ok }, { container }] = await Promise.all([searchParams, requireUser("master")]);
  const stores = await container.repositories.stores.list();

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_22rem]">
      <section>
        <h1 className="mb-4 text-xl font-semibold">Lojas</h1>
        <Flash error={error} ok={ok} />
        {stores.length === 0 ? (
          <p className="text-zinc-500">Nenhuma loja cadastrada.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded border border-zinc-200">
            {stores.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-zinc-500">
                    {s.slug} · {s.isActive ? "ativa" : "inativa"}
                  </p>
                </div>
                <form action={setStoreActiveAction}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="isActive" value={String(!s.isActive)} />
                  <button type="submit" className="text-sm text-zinc-600 underline">
                    {s.isActive ? "Desativar" : "Reativar"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Nova loja</h2>
        <form action={createStoreAction} className="flex flex-col gap-3">
          <input name="name" required placeholder="Nome da loja" className={input} />
          <input name="slug" placeholder="Identificador (opcional)" className={input} />
          <input name="document" placeholder="CNPJ (opcional)" className={input} />
          <hr className="border-zinc-200" />
          <input name="ownerName" required placeholder="Nome do proprietário" className={input} />
          <input name="ownerEmail" type="email" required placeholder="E-mail do proprietário" className={input} />
          <input name="ownerPassword" type="password" required minLength={8} placeholder="Senha inicial (mín. 8)"
            autoComplete="new-password" className={input} />
          <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-white">Criar loja</button>
        </form>
      </section>
    </div>
  );
}
