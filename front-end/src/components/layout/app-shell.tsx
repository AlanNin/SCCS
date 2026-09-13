import type { ReactNode } from "react";
import { SidebarNav } from "./sidebar-nav";
import { MobileTopBar } from "./mobile-top-bar";
import { MobileBottomNav } from "./mobile-bottom-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full">
      <SidebarNav />
      <MobileTopBar />

      <div className="flex min-h-full flex-col md:pl-64">
        <main className="mx-auto w-full max-w-6xl flex-1 pt-6 max-sm:pb-21.5 px-6 ">
          {children}
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
