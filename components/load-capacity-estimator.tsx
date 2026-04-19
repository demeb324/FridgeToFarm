"use client";

import { useMemo, useState } from "react";

import type { CapacityEstimateResult, CapacityEstimateRole } from "@/lib/types";

type LoadCapacityEstimatorProps = {
  role: CapacityEstimateRole;
  title: string;
  description: string;
};

type FormState = {
  bedLength: string;
  bedWidth: string;
  bedHeight: string;
  notes: string;
};

const defaultDimensionsByRole: Record<CapacityEstimateRole, FormState> = {
  distributor: {
    bedLength: "16",
    bedWidth: "7",
    bedHeight: "6",
    notes: "Estimate the occupied share of the truck or trailer bed, not the entire vehicle.",
  },
  farmer: {
    bedLength: "8",
    bedWidth: "5",
    bedHeight: "4",
    notes: "Estimate how much of the pickup bed or trailer space this farm load uses.",
  },
};

const fitStatusLabel: Record<CapacityEstimateResult["fitStatus"], string> = {
  fits_comfortably: "Fits comfortably",
  fits_tightly: "Fits tightly",
  likely_over_capacity: "Likely over capacity",
  unclear: "Unclear from photo",
};

const confidenceClasses: Record<CapacityEstimateResult["confidence"], string> = {
  low: "bg-rose-100 text-rose-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-emerald-100 text-emerald-800",
};

export function LoadCapacityEstimator({
  role,
  title,
  description,
}: LoadCapacityEstimatorProps) {
  const [form, setForm] = useState<FormState>(defaultDimensionsByRole[role]);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<CapacityEstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalVolume = useMemo(() => {
    const length = Number(form.bedLength);
    const width = Number(form.bedWidth);
    const height = Number(form.bedHeight);

    if (!Number.isFinite(length) || !Number.isFinite(width) || !Number.isFinite(height)) {
      return null;
    }

    return Number((length * width * height).toFixed(2));
  }, [form.bedHeight, form.bedLength, form.bedWidth]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!image) {
      setError("Please upload a load image first.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const payload = new FormData();
      payload.set("role", role);
      payload.set("bedLength", form.bedLength);
      payload.set("bedWidth", form.bedWidth);
      payload.set("bedHeight", form.bedHeight);
      payload.set("notes", form.notes);
      payload.set("image", image);

      const response = await fetch("/api/capacity-estimate", {
        method: "POST",
        body: payload,
      });

      const data = (await response.json()) as CapacityEstimateResult | { error: string };

      if (!response.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Failed to estimate load capacity.");
      }

      setResult(data);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            AI load estimate
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-slate-600">{description}</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <label className="block rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-700">
            <span className="font-semibold text-slate-900">Load photo</span>
            <span className="mt-1 block text-sm text-slate-600">
              Upload a clear image showing as much of the load and cargo bed as possible.
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="mt-4 block w-full text-sm text-slate-700"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setImage(nextFile);
                setResult(null);
                setError(null);

                if (!nextFile) {
                  setPreviewUrl((current) => {
                    if (current) {
                      URL.revokeObjectURL(current);
                    }

                    return null;
                  });
                  return;
                }

                const nextPreviewUrl = URL.createObjectURL(nextFile);
                setPreviewUrl((current) => {
                  if (current) {
                    URL.revokeObjectURL(current);
                  }

                  return nextPreviewUrl;
                });
              }}
            />
          </label>

          {previewUrl ? (
            <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-100">
              <img src={previewUrl} alt="Load preview" className="h-72 w-full object-cover" />
            </div>
          ) : (
            <div className="flex h-72 items-center justify-center rounded-[1.5rem] border border-slate-200 bg-slate-50 text-sm text-slate-500">
              Upload a photo to preview it here.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm text-slate-700">
              Bed length (ft)
              <input
                value={form.bedLength}
                onChange={(event) => setForm((current) => ({ ...current, bedLength: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
              />
            </label>
            <label className="text-sm text-slate-700">
              Bed width (ft)
              <input
                value={form.bedWidth}
                onChange={(event) => setForm((current) => ({ ...current, bedWidth: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
              />
            </label>
            <label className="text-sm text-slate-700">
              Max height (ft)
              <input
                value={form.bedHeight}
                onChange={(event) => setForm((current) => ({ ...current, bedHeight: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
              />
            </label>
          </div>

          <label className="block text-sm text-slate-700">
            Notes for the estimator
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              rows={4}
              className="mt-2 w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
            />
          </label>

          <div className="rounded-[1.5rem] bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Approximate total bed volume</p>
            <p className="mt-2">{totalVolume ? `${totalVolume} cubic feet` : "Enter valid bed dimensions."}</p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Estimating load..." : "Estimate load capacity"}
          </button>

          <p className="text-xs leading-6 text-slate-500">
            This is a visual estimate only. It is best for quick planning, not for exact measurements or weight limits.
          </p>

          {error ? (
            <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>
      </form>

      {result ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Estimate result</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">{result.estimatedFillPercentage}% occupied</h3>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-semibold ${confidenceClasses[result.confidence]}`}>
                {result.confidence} confidence
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-700">{result.summary}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.25rem] bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Used volume</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{result.estimatedUsedVolume} cu ft</p>
              </div>
              <div className="rounded-[1.25rem] bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Remaining volume</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{result.estimatedRemainingVolume} cu ft</p>
              </div>
              <div className="rounded-[1.25rem] bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Floor coverage</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{result.estimatedFloorCoveragePercentage}%</p>
              </div>
              <div className="rounded-[1.25rem] bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Height usage</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{result.estimatedHeightUsagePercentage}%</p>
              </div>
            </div>
            <div className="mt-4 rounded-[1.25rem] border border-emerald-200 bg-white p-4 text-sm text-slate-700">
              <span className="font-semibold text-slate-900">Fit status:</span> {fitStatusLabel[result.fitStatus]}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">Visible cues</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                {result.visibleCues.map((cue) => (
                  <li key={cue}>• {cue}</li>
                ))}
              </ul>
            </article>
            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">Assumptions</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                {result.assumptions.map((assumption) => (
                  <li key={assumption}>• {assumption}</li>
                ))}
              </ul>
            </article>
            <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">Safety notes</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                {result.safetyNotes.map((note) => (
                  <li key={note}>• {note}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      ) : null}
    </section>
  );
}
