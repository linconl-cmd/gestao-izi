import { signInAction } from "@/presentation/actions/auth";

const MESSAGES: Record<string, string> = {
  invalid: "Informe e-mail e senha válidos.",
  credentials: "E-mail ou senha incorretos.",
  unprovisioned: "Sua conta ainda não foi liberada. Fale com o administrador da loja.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? MESSAGES[error] : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold">Entrar</h1>
      <form action={signInAction} className="flex flex-col gap-3">
        <input name="email" type="email" required autoComplete="email" placeholder="E-mail"
          className="rounded border border-zinc-300 px-3 py-2" />
        <input name="password" type="password" required autoComplete="current-password" placeholder="Senha"
          className="rounded border border-zinc-300 px-3 py-2" />
        {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
        <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-white">Entrar</button>
      </form>
    </main>
  );
}
