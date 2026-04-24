"use client";

import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const farmerId = searchParams.get("farmer");

  const [confirmed, setConfirmed] = useState(false);

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/farmers/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ opted_out: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to unsubscribe.");
      }
      return res.json();
    },
    onSuccess: () => setConfirmed(true),
  });

  if (!farmerId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Invalid Link</h1>
          <p className="mt-2 text-sm text-slate-600">
            This unsubscribe link is invalid. Please contact the hub directly.
          </p>
        </div>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-emerald-900">You&apos;ve been unsubscribed</h1>
          <p className="mt-2 text-sm text-emerald-700">
            You will no longer receive SMS notifications. You can re-register by calling the hub directly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Unsubscribe from SMS</h1>
        <p className="mt-2 text-sm text-slate-600">
          Do you want to unsubscribe from all SMS notifications about delivery routes?
        </p>
        <button
          type="button"
          onClick={() => mutation.mutate(farmerId)}
          disabled={mutation.isPending}
          className="mt-6 w-full rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {mutation.isPending ? "Unsubscribing…" : "Yes, unsubscribe me"}
        </button>
        {mutation.isError && (
          <p className="mt-3 text-sm text-red-600">{mutation.error.message}</p>
        )}
      </div>
    </div>
  );
}