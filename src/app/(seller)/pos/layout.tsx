import type { ReactNode } from "react";
import { RoleShell } from "@/presentation/components/layout/role-shell";

export default function PosLayout({ children }: { children: ReactNode }) {
  return (
    <RoleShell roles={["owner", "manager", "seller"]} wide>
      {children}
    </RoleShell>
  );
}
