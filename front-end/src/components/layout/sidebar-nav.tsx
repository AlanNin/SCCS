"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Forklift } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isNavActive } from "./nav-items";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <Forklift className="size-6 text-secondary" aria-hidden />
        <div className="leading-tight">
          <p className="font-semibold text-sidebar-foreground items-center">
            SCCS
          </p>
          <p className="text-[11px] font-medium text-sidebar-foreground/55">
            Your Warehouse Assistant
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary/15 text-sidebar-primary"
                  : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              {active && (
                <span className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-primary" />
              )}
              <Icon className="size-4.5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <p className="text-[11px] leading-relaxed text-sidebar-foreground/45">
          Smart Cycle Count Scoring (SCCS) - warehouse bin risk heatmap &amp;
          audit workflow.
        </p>
      </div>
    </aside>
  );
}
