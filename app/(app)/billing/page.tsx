import { getUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import BillingClient from "@/components/BillingClient";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const user = await getUser();
  if (!user || !can(user.role, "billing")) return <p className="text-red-600">No access.</p>;
  return <BillingClient />;
}
