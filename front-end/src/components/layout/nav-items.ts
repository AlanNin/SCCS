import { ClipboardList, LayoutGrid, ListChecks, ScanLine } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", shortLabel: "Home", icon: LayoutGrid },
  { href: "/audit-plans", label: "Audit Plans", shortLabel: "Plans", icon: ClipboardList },
  { href: "/audit-tasks", label: "Tasks", shortLabel: "Tasks", icon: ListChecks },
  { href: "/count", label: "Count a bin", shortLabel: "Count", icon: ScanLine },
] as const;

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
