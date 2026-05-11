import type { ProviderName } from "@/lib/ai/types";

const DEFAULT_DAILY_BUDGET_USD = Number(process.env.AI_DAILY_BUDGET_USD ?? "50");
const budgetState = new Map<string, { day: string; spent: number }>();

function currentDayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function canSpend(requestScope = "global"): boolean {
  const day = currentDayKey();
  const entry = budgetState.get(requestScope);
  if (!entry || entry.day !== day) return true;
  return entry.spent < DEFAULT_DAILY_BUDGET_USD;
}

export function recordSpend(amount: number, requestScope = "global"): number {
  const day = currentDayKey();
  const prev = budgetState.get(requestScope);
  const spent = prev && prev.day === day ? prev.spent + amount : amount;
  budgetState.set(requestScope, { day, spent });
  return spent;
}

export function shouldUseCheaperModel(provider: ProviderName): boolean {
  if (!canSpend("global")) return true;
  return provider === "openai" && Number(process.env.AI_FORCE_LOW_COST ?? "0") === 1;
}
