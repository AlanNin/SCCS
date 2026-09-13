"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2, ScanLine, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { RiskBadge } from "@/components/bins/risk-badge";
import { binSearchOptions } from "@/lib/api/bins";

export function BinSearch() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isFetching } = useQuery(binSearchOptions(debounced));

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <div className="flex flex-col items-center gap-2 pt-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ScanLine className="size-6" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold">Count a bin</h1>
        <p className="text-sm text-muted-foreground">Search or scan a bin code to begin.</p>
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. A1-R1-B01"
          autoFocus
          className="h-13 rounded-xl pl-10 text-base shadow-xs"
          inputMode="text"
          autoComplete="off"
        />
        {isFetching && (
          <Loader2 className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {debounced.trim().length > 0 && results?.length === 0 && !isFetching && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No bins match &quot;{debounced}&quot;.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {results?.map((bin) => (
          <li key={bin.id}>
            <Link href={`/count/${bin.id}`}>
              <Card className="border border-transparent py-0 transition-all hover:border-primary/40 hover:shadow-sm">
                <CardContent className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono font-semibold">{bin.code}</p>
                    <p className="text-xs text-muted-foreground">
                      Aisle {bin.aisle.code} · Rack {bin.rack.code}
                    </p>
                  </div>
                  <RiskBadge band={bin.band} score={bin.riskScore} />
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
