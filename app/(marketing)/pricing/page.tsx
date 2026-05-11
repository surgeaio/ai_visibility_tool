import { PricingCards } from "@/components/marketing/PricingCards";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-white">Pricing</h1>
        <p className="mt-4 text-neutral-400">Transparent tiers for teams tracking AI visibility.</p>
      </div>
      <PricingCards />
    </div>
  );
}
