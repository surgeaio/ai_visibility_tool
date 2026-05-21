/**
 * Structured logging utility.
 *
 * Emits compact JSON lines in production (Vercel/Railway log aggregators parse them).
 * Falls back to readable console.* calls in development.
 */

type Level = "info" | "warn" | "error" | "debug";

interface LogEntry {
  ts: string;
  level: Level;
  module: string;
  msg: string;
  [key: string]: unknown;
}

const isProd = process.env.NODE_ENV === "production";

function emit(level: Level, module: string, msg: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    module,
    msg,
    ...data,
  };
  if (isProd) {
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    fn(JSON.stringify(entry));
  } else {
    const prefix = `[${module}]`;
    if (level === "error") console.error(prefix, msg, data ?? "");
    else if (level === "warn") console.warn(prefix, msg, data ?? "");
    else console.log(prefix, msg, data ?? "");
  }
}

export const logger = {
  info:  (module: string, msg: string, data?: Record<string, unknown>) => emit("info",  module, msg, data),
  warn:  (module: string, msg: string, data?: Record<string, unknown>) => emit("warn",  module, msg, data),
  error: (module: string, msg: string, data?: Record<string, unknown>) => emit("error", module, msg, data),
  debug: (module: string, msg: string, data?: Record<string, unknown>) => {
    if (process.env.LOG_LEVEL === "debug") emit("debug", module, msg, data);
  },

  /** Log a model execution result. */
  model(model: string, status: "ok" | "fail", extra?: { chars?: number; ms?: number; error?: string }) {
    emit(
      status === "ok" ? "info" : "warn",
      "ai-model",
      `${model} ${status}`,
      { model, status, ...extra },
    );
  },

  /** Log a DB persistence event. */
  persist(table: string, status: "ok" | "fail", extra?: Record<string, unknown>) {
    emit(
      status === "ok" ? "info" : "error",
      "db-persist",
      `${table} ${status}`,
      { table, status, ...extra },
    );
  },

  /** Log an API route timing. */
  api(route: string, method: string, durationMs: number, statusCode?: number) {
    emit("info", "api", `${method} ${route}`, { route, method, durationMs, statusCode });
  },
};
