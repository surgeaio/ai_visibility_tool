"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MultiSelectOption = { value: string; label: string };

export function MultiSelectField({
  label,
  options,
  selected,
  onChange,
  className,
}: {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  const summary =
    selected.length === 0
      ? "None selected"
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? "1 selected")
        : `${selected.length} selected`;

  return (
    <div className={cn("min-w-0", className)}>
      <label className="text-xs font-medium text-neutral-500">{label}</label>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="mt-1 flex h-9 w-full justify-between border-[#262626] bg-[#0a0a0a] px-3 text-sm font-normal text-white hover:bg-[#1a1a1a]"
          >
            <span className="truncate">{summary}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-64 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto border-[#262626] bg-[#111]"
        >
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-neutral-500">No options</p>
          ) : (
            options.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-neutral-200 hover:bg-[#1a1a1a]"
              >
                <Checkbox
                  checked={selected.includes(opt.value)}
                  onCheckedChange={() => toggle(opt.value)}
                />
                <span className="truncate">{opt.label}</span>
              </label>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
