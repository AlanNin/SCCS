import Link from "next/link";
import { PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <PackageSearch className="size-7" aria-hidden />
      </span>
      <div>
        <h1 className="text-lg font-semibold">Not found</h1>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t find what you were looking for.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
