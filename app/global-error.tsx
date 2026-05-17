"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error]", error.message, error.stack, error.digest);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black px-4 text-white">
        <h1 className="text-xl font-semibold">Application error</h1>
        <p className="max-w-md text-center text-sm text-neutral-400">
          A critical error occurred. Please try again or contact support.
        </p>
        <button
          type="button"
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black"
          onClick={() => reset()}
        >
          Try again
        </button>
        <a href="/login" className="text-sm text-neutral-400 underline">
          Back to login
        </a>
      </body>
    </html>
  );
}
