import type { ReactNode } from "react";
import { AppShell } from "@/presentation/components/layout/app-shell";

export default function MasterLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell title="Gestão Izi · Master" nav={[{ href: "/master/stores", label: "Lojas" }]}>
      {children}
    </AppShell>
  );
}
