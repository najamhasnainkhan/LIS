import { getUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import SamplesClient from "@/components/SamplesClient";

export const dynamic = "force-dynamic";

export default async function SamplesPage() {
  const user = await getUser();
  if (!user || !can(user.role, "samples")) return <p className="text-red-600">No access.</p>;
  return <SamplesClient canEnter={can(user.role, "results.enter")} canVerify={can(user.role, "results.verify")} />;
}
