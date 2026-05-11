"use client";

import * as React from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect } from "react";
import { VisibilityChart } from "@/components/dashboard/VisibilityChart";

export function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative mx-auto max-w-5xl"
    >
      <div className="overflow-hidden rounded-xl border border-[#262626] bg-[#0a0a0a] shadow-2xl shadow-black/50">
        <div className="flex items-center gap-2 border-b border-[#262626] bg-[#111] px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
          </div>
          <div className="ml-4 flex-1 rounded-md border border-[#262626] bg-black px-3 py-1 text-xs text-neutral-500">
            app.peec.ai/dashboard
          </div>
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <MetricCard label="Visibility" fraction="3/14" />
              <MetricCard label="Sentiment" fraction="2/14" />
              <MetricCard label="Position" fraction="5/14" />
            </div>
            <div className="rounded-lg border border-[#262626] bg-[#111] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-white">Visibility index</span>
                <AnimatedPercent target={72} />
              </div>
              <VisibilityChart />
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Competitor share</p>
            <BarRow label="Salesforce" value={62} />
            <BarRow label="Attio" value={47} highlight />
            <BarRow label="HubSpot" value={65} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AnimatedPercent({ target }: { target: number }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 120, damping: 22 });
  const [display, setDisplay] = React.useState(0);

  useEffect(() => {
    mv.set(target);
  }, [mv, target]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(Math.round(v)));
    return () => unsub();
  }, [spring]);

  return (
    <span className="font-mono text-2xl font-semibold text-white tabular-nums">
      {display}%
    </span>
  );
}

function MetricCard({ label, fraction }: { label: string; fraction: string }) {
  return (
    <div className="rounded-lg border border-[#262626] bg-[#111] px-3 py-3 text-center">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 font-mono text-lg text-white">{fraction}</p>
    </div>
  );
}

function BarRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-neutral-400">
        <span className={highlight ? "text-white" : ""}>{label}</span>
        <span className="font-mono text-neutral-300">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#1a1a1a]">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={highlight ? "h-full rounded-full bg-white" : "h-full rounded-full bg-neutral-600"}
        />
      </div>
    </div>
  );
}
