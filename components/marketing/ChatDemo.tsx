"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

const QUERY = "What are the best CRMs for Startups?";

const RESPONSE =
  "For startups, teams often evaluate HubSpot for breadth, Salesforce for scale, and Attio for a flexible modern CRM with strong UX. Pricing and integrations remain key decision factors.";

export function ChatDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 4), 1400);
    return () => clearInterval(t);
  }, []);

  const brands = [
    { name: "HubSpot", tone: "neutral" as const },
    { name: "Salesforce", tone: "neutral" as const },
    { name: "Attio", tone: "positive" as const },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mx-auto max-w-3xl rounded-xl border border-[#262626] bg-[#111] p-6"
    >
      <p className="mb-3 font-mono text-xs text-neutral-500">Simulated AI response</p>
      <div className="mb-4 rounded-lg border border-[#262626] bg-black px-4 py-3 text-sm text-neutral-300">
        <span className="text-neutral-500">Q:</span> {QUERY}
      </div>
      <p className="text-sm leading-relaxed text-neutral-200">
        {RESPONSE.split(/(\bHubSpot\b|\bSalesforce\b|\bAttio\b)/g).map((part, i) => {
          const hit = brands.find((b) => b.name === part);
          if (!hit)
            return (
              <span key={i} className={step >= 2 ? "transition-colors duration-300" : ""}>
                {part}
              </span>
            );
          const cls =
            hit.tone === "positive"
              ? "bg-emerald-500/25 text-emerald-100"
              : "bg-yellow-500/20 text-yellow-100";
          return (
            <motion.span
              key={i}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: step >= 1 ? 1 : 0.4 }}
              className={`rounded px-0.5 ${cls}`}
            >
              {part}
            </motion.span>
          );
        })}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {step >= 3 && (
          <>
            <Badge variant="green">positive · Attio</Badge>
            <Badge variant="yellow">neutral · HubSpot</Badge>
            <Badge variant="yellow">neutral · Salesforce</Badge>
          </>
        )}
      </div>
    </motion.div>
  );
}
