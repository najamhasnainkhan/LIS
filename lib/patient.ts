export interface PatientInput {
  name: string; dob: string | null; gender: string | null;
  phone: string | null; email: string | null; address: string | null;
}

const clean = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
};

export function parsePatient(b: any): { data: PatientInput } | { error: string } {
  const name = clean(b?.name);
  if (!name) return { error: "Name is required" };
  const dob = clean(b?.dob);
  if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return { error: "Date of birth must be YYYY-MM-DD" };
  const gender = clean(b?.gender);
  if (gender && !["male", "female", "other"].includes(gender)) return { error: "Invalid gender" };
  const email = clean(b?.email);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Invalid email" };
  return { data: { name, dob, gender, phone: clean(b?.phone), email, address: clean(b?.address) } };
}
