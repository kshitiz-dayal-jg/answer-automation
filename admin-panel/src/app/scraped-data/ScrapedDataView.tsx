"use client";

import { useState, useTransition } from "react";
import { fetchScrapedDataAction } from "./actions";

export function ScrapedDataView() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFetch() {
    setError(null);
    startTransition(async () => {
      try {
        setData(await fetchScrapedDataAction());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
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
