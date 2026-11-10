import { getUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import DashboardClient from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user || !can(user.role, "dashboard")) return <p className="text-red-600">No access.</p>;
  return <DashboardClient />;
}
