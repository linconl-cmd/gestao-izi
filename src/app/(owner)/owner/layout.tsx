import type { ReactNode } from "react";
import { RoleShell } from "@/presentation/components/layout/role-shell";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return <RoleShell roles={["owner", "manager"]}>{children}</RoleShell>;
}
