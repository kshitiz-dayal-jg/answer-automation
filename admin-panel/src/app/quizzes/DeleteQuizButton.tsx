"use client";

import { useTransition } from "react";
import { deleteQuizAction } from "./actions";

export function DeleteQuizButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this quiz?")) return;
        startTransition(async () => {
          await deleteQuizAction(id);
        });
      }}
      className="text-sm text-red-600 hover:underline disabled:opacity-50"
    >
      {pending ? "Deleting..." : "Delete"}
    </button>
  );
}
