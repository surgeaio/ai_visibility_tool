"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function TablePagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-end gap-3 border-t border-[#262626] px-4 py-3">
      <span className="text-xs text-neutral-500">
        {total} row{total === 1 ? "" : "s"} · Page {page} of {totalPages}
      </span>
      <div className="flex gap-1">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
