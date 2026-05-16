"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layers, Clock, Settings } from "lucide-react";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/assets", icon: Layers, label: "Assets" },
  { href: "/history", icon: Clock, label: "History" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-[60px] flex-col border-r border-zinc-900 bg-[#0a0a0a]">
      <nav className="flex flex-1 flex-col items-center justify-center gap-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex size-10 items-center justify-center rounded-lg transition ${
                isActive
                  ? "bg-cyan-400/10 text-cyan-400"
                  : "text-zinc-600 hover:bg-zinc-900 hover:text-zinc-400"
              }`}
              aria-label={item.label}
            >
              <Icon className="size-5" />
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-center pb-5">
        <div className="flex size-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-500">
          N
        </div>
      </div>
    </aside>
  );
}
