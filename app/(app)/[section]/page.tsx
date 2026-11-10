import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { NAV, can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

// Placeholder for sections built in later phases; still enforces the role check.
export default async function Section({ params }: { params: { section: string } }) {
  const item = NAV.find((n) => n.href === `/${params.section}`);
  if (!item) notFound();
  const user = await getUser();
  if (!user || !can(user.role, item.perm)) {
    return <p className="text-red-600">You do not have access to this section.</p>;
  }
  return (
    <div>
      <h1 className="text-2xl font-semibold">{item.label}</h1>
      <p className="mt-2 text-slate-600">This section is coming in a later phase.</p>
    </div>
  );
}
