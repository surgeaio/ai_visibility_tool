"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BarChart2, Eye, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChatDemo } from "@/components/marketing/ChatDemo";
import { DashboardMockup } from "@/components/marketing/DashboardMockup";
import { PricingCards } from "@/components/marketing/PricingCards";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

const BRANDS_ROW1 = ["Mercury", "Raycast", "Descript", "Hex", "Pitch", "Granola"];
const BRANDS_ROW2 = ["BBH", "EssenceMediacom", "DEPT", "OMD", "TBWA", "Vayner"];
const FEATURES = [
  {
    icon: Eye,
    title: "Visibility",
    body: "See the share of chats where your brand is mentioned and understand how often you show up in conversations.",
  },
  {
    icon: BarChart2,
    title: "Position",
    body: "Understand your brand's position within AI search results and uncover opportunities to improve your ranking.",
  },
  {
    icon: Heart,
    title: "Sentiment",
    body: "Find out how your brand is perceived by AI, what's going well, and what requires improvements.",
  },
];

const miniTrend = [
  { m: "Apr", v: 52 },
  { m: "May", v: 58 },
  { m: "Jun", v: 63 },
];

const positionBars = [
  { name: "SF", v: 92 },
  { name: "HS", v: 85 },
  { name: "You", v: 72 },
  { name: "PD", v: 54 },
];

export default function MarketingPage() {
  return (
    <>
      <section className="relative overflow-hidden px-4 pb-20 pt-12 lg:px-6 lg:pb-28 lg:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(34,197,94,0.08),transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center rounded-full border border-[#262626] bg-[#111] px-4 py-1.5 text-xs font-medium text-neutral-300">
              ✦ Trusted by 2,000+ marketing teams
            </span>
            <h1 className="mt-8 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              AI search analytics for marketing teams
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-neutral-400 sm:text-lg">
              Track, analyze, and improve brand performance on AI search platforms through key metrics like Visibility,
              Position, and Sentiment
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button variant="secondary" asChild>
                <Link href="#">Talk to Sales</Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard">Start Free Trial</Link>
              </Button>
            </div>
          </motion.div>
          <div className="mt-16">
            <DashboardMockup />
          </div>
        </div>
      </section>

      <section className="border-y border-[#1f1f1f] bg-[#0a0a0a] py-12">
        <p className="mb-8 text-center text-sm font-medium text-neutral-500">Trusted by 2000+ marketing teams</p>
        <div className="overflow-hidden">
          <div className="animate-marquee flex w-max gap-16 whitespace-nowrap px-4">
            {[...BRANDS_ROW1, ...BRANDS_ROW1].map((b, i) => (
              <span key={`${b}-${i}`} className="text-lg font-semibold text-neutral-600">
                {b}
              </span>
            ))}
          </div>
          <div className="animate-marquee mt-6 flex w-max gap-16 whitespace-nowrap px-4 [animation-delay:-20s]">
            {[...BRANDS_ROW2, ...BRANDS_ROW2].map((b, i) => (
              <span key={`${b}-${i}`} className="text-lg font-semibold text-neutral-600">
                {b}
              </span>
            ))}
          </div>
        </div>
        <p className="mt-8 text-center text-xs text-neutral-600">Brands · Agencies</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-24 lg:px-6">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Understand how AI sees your brand
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="p-8 transition-transform duration-200 hover:-translate-y-0.5">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-[#262626] bg-[#0a0a0a]">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">{body}</p>
            </Card>
          ))}
        </div>
        <div className="mt-16">
          <ChatDemo />
        </div>
      </section>

      <section className="border-t border-[#1f1f1f] bg-black py-24">
        <div className="mx-auto max-w-6xl space-y-24 px-4 lg:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold text-white">Track every AI conversation that matters</h2>
              <p className="mt-4 text-neutral-400">
                Monitor visibility across prompts and models—then double down on the narratives that move pipeline.
              </p>
            </div>
            <Card className="p-6">
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-neutral-500">Visibility over time</p>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={miniTrend}>
                    <XAxis dataKey="m" stroke="#525252" tick={{ fill: "#737373", fontSize: 11 }} />
                    <YAxis hide domain={[40, 70]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#111",
                        border: "1px solid #262626",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Line type="monotone" dataKey="v" stroke="#fff" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Card className="order-2 p-6 lg:order-1">
              <p className="mb-4 text-xs font-medium uppercase tracking-wide text-neutral-500">Share of first mention</p>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={positionBars} layout="vertical" margin={{ left: 8 }}>
                    <XAxis type="number" hide domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" stroke="#737373" width={32} tick={{ fontSize: 11 }} />
                    <Tooltip
                      cursor={{ fill: "transparent" }}
                      contentStyle={{
                        backgroundColor: "#111",
                        border: "1px solid #262626",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="v" radius={[0, 4, 4, 0]}>
                      {positionBars.map((entry) => (
                        <Cell key={entry.name} fill={entry.name === "You" ? "#ffffff" : "#404040"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl font-semibold text-white">See exactly where competitors rank</h2>
              <p className="mt-4 text-neutral-400">
                Benchmark mention order and intensity vs named competitors—spot dominance before it becomes conventional
                wisdom.
              </p>
            </div>
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold text-white">Get AI-powered recommendations</h2>
              <p className="mt-4 text-neutral-400">
                Turn patterns into prioritized plays—from messaging fixes to net-new pages your buyers (and models) expect.
              </p>
            </div>
            <Card className="space-y-4 p-6">
              <div className="rounded-lg border border-[#262626] bg-[#0a0a0a] p-4">
                <p className="text-xs text-emerald-400">HIGH IMPACT</p>
                <p className="mt-2 text-sm font-medium text-white">Improve your onboarding UX content</p>
                <p className="mt-2 text-xs text-neutral-500">
                  Models associate your brand with “complex UI” in onboarding prompts.
                </p>
              </div>
              <div className="rounded-lg border border-dashed border-[#262626] p-4 text-sm text-neutral-400">
                + 6 more recommendations in your workspace
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-24 lg:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-semibold text-white">Pricing</h2>
          <p className="mt-3 text-neutral-400">Start free. Upgrade when AI visibility becomes a core KPI.</p>
        </div>
        <PricingCards />
      </section>
    </>
  );
}
