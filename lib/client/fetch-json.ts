export type FetchJsonResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; raw?: string };

/**
 * Parses JSON safely — avoids "Unexpected token 'A'" when Vercel returns HTML/plain text on 504.
 */
export async function fetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<FetchJsonResult<T>> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: e instanceof Error ? e.message : "Network request failed",
    };
  }

  const text = await res.text();
  let data: T | undefined;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      return {
        ok: false,
        status: res.status,
        error:
          res.status === 504
            ? "Server timed out — sync may still be running in the background. Refresh in a minute."
            : `Invalid server response (${res.status})`,
        raw: text.slice(0, 200),
      };
    }
  }

  if (!res.ok) {
    const errBody = data as { error?: string } | undefined;
    return {
      ok: false,
      status: res.status,
      error: errBody?.error ?? `Request failed (${res.status})`,
      raw: text.slice(0, 200),
    };
  }

  return { ok: true, status: res.status, data: data as T };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
