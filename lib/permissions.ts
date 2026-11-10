export type Role = "admin" | "receptionist" | "technician" | "pathologist";

export type Permission =
  | "patients.read"
  | "patients.write"
  | "billing"
  | "catalog.read"
  | "catalog.write"
  | "samples"
  | "results.enter"
  | "results.verify"
  | "reports"
  | "inventory"
  | "dashboard"
  | "staff"
  | "audit";

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ["catalog.read", "catalog.write", "patients.read", "patients.write", "billing", "samples", "results.enter", "results.verify", "reports", "inventory", "dashboard", "staff", "audit"],
  receptionist: ["catalog.read", "patients.read", "patients.write", "billing", "reports"],
  technician: ["catalog.read", "patients.read", "samples", "results.enter", "reports", "inventory"],
  pathologist: ["catalog.read", "patients.read", "samples", "results.verify", "reports", "dashboard"],
};

export function can(role: string, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role as Role]?.includes(perm) ?? false;
}

export interface NavItem { href: string; label: string; perm: Permission }

export const NAV: NavItem[] = [
  { href: "/patients", label: "Patients", perm: "patients.read" },
  { href: "/catalog", label: "Test Catalog", perm: "catalog.read" },
  { href: "/billing", label: "Billing", perm: "billing" },
  { href: "/samples", label: "Samples", perm: "samples" },
  { href: "/reports", label: "Reports", perm: "reports" },
  { href: "/dashboard", label: "Dashboard", perm: "dashboard" },
  { href: "/inventory", label: "Inventory", perm: "inventory" },
  { href: "/staff", label: "Staff", perm: "staff" },
  { href: "/audit-logs", label: "Audit Logs", perm: "audit" },
];

export function navFor(role: string): NavItem[] {
  return NAV.filter((n) => can(role, n.perm));
}
