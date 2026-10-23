import { Shirt } from "lucide-react";
import { signInAction } from "@/presentation/actions/auth";
import { buttonClass, inputClass } from "@/presentation/components/shared/styles";
import { ThemeToggle } from "@/presentation/components/layout/theme-toggle";

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
    <main className="relative grid min-h-dvh place-items-center px-4">
      <ThemeToggle className="absolute top-4 right-4" />
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-3 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Shirt className="size-6" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Gestão Izi</h1>
          <p className="text-sm text-muted-foreground">Entre para abrir o caixa ou gerenciar sua loja.</p>
        </div>
        <form action={signInAction} className="space-y-3 rounded-2xl border bg-card p-6 shadow-soft">
          <input name="email" type="email" required autoComplete="email" placeholder="E-mail" aria-label="E-mail" className={inputClass} />
          <input name="password" type="password" required autoComplete="current-password" placeholder="Senha" aria-label="Senha" className={inputClass} />
          {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
          <button type="submit" className={`${buttonClass} w-full`}>Entrar</button>
        </form>
      </div>
    </main>
  );
}
