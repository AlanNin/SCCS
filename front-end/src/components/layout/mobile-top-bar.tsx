import Link from "next/link";
import { Forklift } from "lucide-react";

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2.5 border-b border-sidebar-border bg-sidebar px-4 md:hidden">
      <Link href="/" className="flex items-center gap-2">
        <Forklift className="size-5 text-secondary" aria-hidden />
        <p className="text-xl font-semibold text-sidebar-foreground items-center">
          SCCS
        </p>
      </Link>
      <span className="text-xs font-medium text-sidebar-foreground/75 mt-0.5 ml-auto">
        Your Warehouse Assistant
      </span>
    </header>
  );
}
