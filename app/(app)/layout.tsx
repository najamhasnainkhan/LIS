import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getUser } from "@/lib/auth";
import { navFor } from "@/lib/permissions";
import Sidebar from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const items = navFor(user.role).map(({ href, label }) => ({ href, label }));
  return (
    <div className="md:flex">
      <Sidebar items={items} name={user.name} role={user.role} />
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
