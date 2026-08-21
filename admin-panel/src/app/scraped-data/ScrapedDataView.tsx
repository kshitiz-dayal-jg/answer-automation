"use client";

import { useState } from "react";

export function ScrapedDataView() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleFetch() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/scraped-data");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Something went wrong");
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={handleFetch}
        disabled={pending}
        className="self-start rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Fetching..." : "Fetch Data"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && (
        <pre className="overflow-x-auto rounded-md border border-black/10 p-4 text-sm dark:border-white/10">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
