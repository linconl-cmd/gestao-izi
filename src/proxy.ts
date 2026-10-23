import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicEnv } from "@/infra/config/env";
import { homeFor, isAllowed, LOGIN_PATH, roleFromClaims } from "@/presentation/lib/routes";

/** Renova a sessão e aplica o guard de rotas por papel (defesa em profundidade; o RLS é a barreira real). */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = getPublicEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // getClaims valida a assinatura do JWT; não use getSession() aqui.
  const { data } = await supabase.auth.getClaims();
  const role = roleFromClaims(data?.claims ?? null);
  const { pathname } = request.nextUrl;

  const redirect = (path: string) => {
    const res = NextResponse.redirect(new URL(path, request.url));
    for (const cookie of response.cookies.getAll()) res.cookies.set(cookie);
    return res;
  };

  if (pathname === LOGIN_PATH) return role ? redirect(homeFor(role)) : response;
  if (!role) return redirect(LOGIN_PATH);
  if (!isAllowed(pathname, role)) return redirect(homeFor(role));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
