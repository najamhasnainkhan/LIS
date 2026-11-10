import { getUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import InventoryClient from "@/components/InventoryClient";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const user = await getUser();
  if (!user || !can(user.role, "inventory")) return <p className="text-red-600">No access.</p>;
  return <InventoryClient />;
}
