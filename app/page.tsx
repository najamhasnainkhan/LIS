import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { navFor } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getUser();
  if (!user) redirect("/login");
  redirect(navFor(user.role)[0]?.href ?? "/login");
}
