import { getUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import StaffClient from "@/components/StaffClient";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const user = await getUser();
  if (!user || !can(user.role, "staff")) return <p className="text-red-600">No access.</p>;
  return <StaffClient meId={user.id} />;
}
