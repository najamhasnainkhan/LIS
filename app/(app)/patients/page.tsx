import { getUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import PatientsClient from "@/components/PatientsClient";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const user = await getUser();
  if (!user || !can(user.role, "patients.read")) return <p className="text-red-600">No access.</p>;
  return <PatientsClient canWrite={can(user.role, "patients.write")} />;
}
