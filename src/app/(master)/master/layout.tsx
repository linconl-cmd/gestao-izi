import type { ReactNode } from "react";
import { AppShell } from "@/presentation/components/layout/app-shell";

export default function MasterLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell title="Izi · Master" nav={[{ href: "/master/stores", label: "Lojas", icon: "store" }]}>
      {children}
    </AppShell>
  );
}
