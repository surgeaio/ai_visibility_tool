import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors duration-200",
  {
    variants: {
      variant: {
        default: "border-transparent bg-white text-black",
        secondary: "border-[#262626] bg-[#1a1a1a] text-neutral-200",
        outline: "border-[#262626] text-neutral-200",
        green: "border-transparent bg-emerald-500/15 text-emerald-400",
        yellow: "border-transparent bg-yellow-500/15 text-yellow-400",
        red: "border-transparent bg-red-500/15 text-red-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
