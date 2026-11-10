import { getUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import CatalogClient from "@/components/CatalogClient";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const user = await getUser();
  if (!user || !can(user.role, "catalog.read")) return <p className="text-red-600">No access.</p>;
  return <CatalogClient canWrite={can(user.role, "catalog.write")} />;
}
