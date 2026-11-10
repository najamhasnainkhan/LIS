import { getUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import AuditClient from "@/components/AuditClient";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const user = await getUser();
  if (!user || !can(user.role, "audit")) return <p className="text-red-600">No access.</p>;
  return <AuditClient />;
}
