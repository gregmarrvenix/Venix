"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMsal } from "@azure/msal-react";
import { useAuthContext } from "@/components/auth/AuthGuard";

const navLinks = [
  { href: "/", label: "Time Entry" },
  { href: "/customers", label: "Customers" },
  { href: "/projects", label: "Projects" },
  { href: "/contractors", label: "Contractors" },
  { href: "/reports", label: "Reports" },
];

export default function Header() {
  const pathname = usePathname();
  const { displayName } = useAuthContext();
  const { instance } = useMsal();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-slate-700 bg-slate-800 px-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold text-white">
          V
        </div>
        <span className="text-sm font-semibold text-slate-200">
          Venix Time Tracker
        </span>
      </div>

      <nav className="hidden items-center gap-1 md:flex">
        {navLinks.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? "text-indigo-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-400">{displayName}</span>
        <button
          onClick={() => instance.logoutRedirect()}
          className="rounded-md px-3 py-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
