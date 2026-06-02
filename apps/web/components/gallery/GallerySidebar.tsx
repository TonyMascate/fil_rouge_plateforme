"use client";

import { useState } from "react";
import { ChevronDown, Images } from "lucide-react";
import { cn } from "@/lib/utils";
import type { YearGroup } from "./group-by-month";

interface GallerySidebarProps {
  total: number;
  years: YearGroup[];
  onJumpToMonth: (key: string) => void;
}

export function GallerySidebar({ total, years, onJumpToMonth }: GallerySidebarProps) {
  const [closedYears, setClosedYears] = useState<Record<string, boolean>>({});

  function toggleYear(year: string) {
    setClosedYears((current) => ({ ...current, [year]: !current[year] }));
  }

  return (
    <aside className="sticky top-16 hidden w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-card px-3 py-5 md:flex">
      <div className="px-2 pb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Vue
      </div>
      <button className="flex items-center gap-2 rounded-lg bg-primary/8 px-2.5 py-2 text-sm font-medium text-primary">
        <Images className="size-4" />
        <span className="flex-1 text-left">Toutes les photos</span>
        <span className="rounded-full bg-primary/12 px-2 text-xs text-primary">{total}</span>
      </button>

      {years.length > 0 && (
        <div className="mt-2 px-2 pb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Années
        </div>
      )}

      {years.map((yearGroup) => {
        const isOpen = !closedYears[yearGroup.year];
        return (
          <div key={yearGroup.year}>
            <button
              onClick={() => toggleYear(yearGroup.year)}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <span>{yearGroup.year}</span>
              <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                {yearGroup.count}
                <ChevronDown
                  className={cn("size-3.5 transition-transform", isOpen ? "rotate-180" : "")}
                />
              </span>
            </button>
            {isOpen &&
              yearGroup.months.map((month) => (
                <button
                  key={month.key}
                  onClick={() => onJumpToMonth(month.key)}
                  className="flex w-full items-center rounded-lg py-1.5 pl-5 pr-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {month.label}
                </button>
              ))}
          </div>
        );
      })}
    </aside>
  );
}
