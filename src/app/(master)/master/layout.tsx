import type { ReactNode } from "react";
import { RoleShell } from "@/presentation/components/layout/role-shell";

export default function MasterLayout({ children }: { children: ReactNode }) {
  return <RoleShell roles={["master"]}>{children}</RoleShell>;
}
