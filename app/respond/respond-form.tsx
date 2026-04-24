"use client";

import { useState } from "react";

type RespondFormProps = {
  routeId: string;
  farmerId: string;
  routeTitle: string;
  hubName: string;
  hubPhone: string;
  hubEmail: string;
  startTime: string;
  endTime: string;
  notes: string | null;
};

type FormState = "idle" | "submitting" | "success" | "error";

export function RespondForm({
  routeId,
  farmerId,
  routeTitle,
  hubName,
  hubPhone,
  hubEmail,
  startTime,
  endTime,
  notes,
}: RespondFormProps) {
  const [responseType, setResponseType] = useState("");
  const [responseNotes, setResponseNotes] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          route_id: routeId,
          farmer_id: farmerId,
          response_type: responseType,
          notes: responseNotes || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to submit response.");
      }

      setFormState("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong.");
      setFormState("error");
    }
  }

  if (formState === "success") {
    return (
      <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">Response recorded</p>
        <h2 className="mt-2 text-xl font-semibold text-emerald-900">
          Your response has been recorded. The hub will contact you if needed.
        </h2>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <input type="hidden" name="route_id" value={routeId} />
      <input type="hidden" name="farmer_id" value={farmerId} />

      <div>
        <p className="text-sm font-medium text-slate-700">What would you like?</p>
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 cursor-pointer">
            <input
              type="radio"
              name="response_type"
              value="crop_pickup"
              checked={responseType === "crop_pickup"}
              onChange={() => setResponseType("crop_pickup")}
              className="h-4 w-4 text-emerald-600"
            />
            <span className="text-sm text-slate-700">Crop Pickup</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 cursor-pointer">
            <input
              type="radio"
              name="response_type"
              value="compost_pickup"
              checked={responseType === "compost_pickup"}
              onChange={() => setResponseType("compost_pickup")}
              className="h-4 w-4 text-emerald-600"
            />
            <span className="text-sm text-slate-700">Compost Pickup</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 cursor-pointer">
            <input
              type="radio"
              name="response_type"
              value="both"
              checked={responseType === "both"}
              onChange={() => setResponseType("both")}
              className="h-4 w-4 text-emerald-600"
            />
            <span className="text-sm text-slate-700">Both</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Notes (optional)
          <textarea
            value={responseNotes}
            onChange={(e) => setResponseNotes(e.target.value)}
            rows={3}
            placeholder="e.g., What crops, how much compost…"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400"
          />
        </label>
      </div>

      {formState === "error" && errorMsg && (
        <p className="text-sm text-red-600">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={!responseType || formState === "submitting"}
        className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {formState === "submitting" ? "Submitting…" : "Submit Response"}
      </button>
    </form>
  );
}