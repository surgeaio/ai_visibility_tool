import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PricingTier = {
  name: string;
  price: string;
  period?: string;
  description?: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
};

const TIERS: PricingTier[] = [
  {
    name: "Starter",
    price: "$0",
    description: "Free",
    features: [
      "3 tracked brands",
      "50 prompts/month",
      "3 AI models",
      "Basic sentiment",
    ],
    cta: "Get Started Free",
    href: "/dashboard",
  },
  {
    name: "Pro",
    price: "$99",
    period: "/mo",
    description: "For growing teams",
    highlighted: true,
    features: [
      "10 tracked brands",
      "500 prompts/month",
      "All AI models",
      "Advanced sentiment + patterns",
      "Recommendations engine",
    ],
    cta: "Start Free Trial",
    href: "/dashboard",
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "Security & scale",
    features: [
      "Unlimited brands",
      "Unlimited prompts",
      "Custom models",
      "API access",
      "White-label",
    ],
    cta: "Talk to Sales",
    href: "#",
  },
];

export function PricingCards({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-6 md:grid-cols-3", className)}>
      {TIERS.map((tier) => (
        <div
          key={tier.name}
          className={cn(
            "flex flex-col rounded-xl border border-[#262626] bg-[#111111] p-8 transition-shadow duration-200",
            tier.highlighted && "border-white/30 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] ring-1 ring-white/10",
          )}
        >
          <div className="mb-6">
            <p className="text-sm font-medium text-neutral-400">{tier.name}</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-semibold text-white">{tier.price}</span>
              {tier.period && <span className="text-neutral-500">{tier.period}</span>}
            </div>
            {tier.description && <p className="mt-1 text-sm text-neutral-500">{tier.description}</p>}
          </div>
          <ul className="mb-8 flex-1 space-y-3 text-sm text-neutral-300">
            {tier.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-emerald-400">✦</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Button variant={tier.highlighted ? "default" : "secondary"} className="w-full" asChild>
            <Link href={tier.href}>{tier.cta}</Link>
          </Button>
        </div>
      ))}
    </div>
  );
}
