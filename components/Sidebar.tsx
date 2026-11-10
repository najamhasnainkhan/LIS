"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar({
  items, name, role,
}: { items: { href: string; label: string }[]; name: string; role: string }) {
  const path = usePathname();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <aside className="flex w-full flex-col bg-teal-900 p-4 text-white md:min-h-screen md:w-56">
      <div className="mb-4 text-lg font-semibold">Pathology LIMS</div>
      <nav aria-label="Main" className="flex flex-1 flex-row flex-wrap gap-1 md:flex-col">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={path.startsWith(i.href) ? "page" : undefined}
            className={`rounded px-3 py-2 text-sm hover:bg-teal-800 ${path.startsWith(i.href) ? "bg-teal-700" : ""}`}
          >
            {i.label}
          </Link>
        ))}
      </nav>
      <div className="mt-4 text-xs">
        <div>{name}</div>
        <div className="capitalize text-teal-200">{role}</div>
        <button onClick={logout} className="mt-2 rounded border border-teal-400 px-3 py-1 hover:bg-teal-800">Sign out</button>
      </div>
    </aside>
  );
}
