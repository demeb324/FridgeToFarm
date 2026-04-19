"use client";

import { useState } from "react";
import type { RoutePlan } from "@/lib/types";

const defaultRoute: RoutePlan = {
  id: "draft-route",
  title: "Fresh Produce South Loop",
  startLocation: "Twin Falls Hub",
  endLocation: "Boise School District",
  startTime: "2026-04-22 06:30",
  endTime: "2026-04-22 15:00",
  notes: "Leave room for two small farm pickups and one compost pallet on return.",
  status: "Draft",
  nearbyFarmers: 14,
  pickupRequests: 3,
  stops: ["Twin Falls Hub", "Jerome farms", "Boise School District", "Compost return"],
};

export function RouteForm() {
  const [formData, setFormData] = useState(defaultRoute);

  const updateField = (field: keyof RoutePlan, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Route creation</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Create or edit a planned trip</h2>
        </div>
        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
          Mock state
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-slate-700">
          Title
          <input
            value={formData.title}
            onChange={(event) => updateField("title", event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
          />
        </label>
        <label className="text-sm text-slate-700">
          Route status
          <select
            value={formData.status}
            onChange={(event) => updateField("status", event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
          >
            <option>Draft</option>
            <option>Open</option>
            <option>Confirmed</option>
            <option>In Transit</option>
            <option>Closed</option>
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Start location
          <input
            value={formData.startLocation}
            onChange={(event) => updateField("startLocation", event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
          />
        </label>
        <label className="text-sm text-slate-700">
          End location
          <input
            value={formData.endLocation}
            onChange={(event) => updateField("endLocation", event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
          />
        </label>
        <label className="text-sm text-slate-700">
          Start time
          <input
            value={formData.startTime}
            onChange={(event) => updateField("startTime", event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
          />
        </label>
        <label className="text-sm text-slate-700">
          End time
          <input
            value={formData.endTime}
            onChange={(event) => updateField("endTime", event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
          />
        </label>
        <label className="text-sm text-slate-700 sm:col-span-2">
          Notes
          <textarea
            value={formData.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            rows={4}
            className="mt-2 w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-400"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-slate-700"
        >
          Save route draft
        </button>
        <button
          type="button"
          className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:-translate-y-0.5 hover:border-slate-400"
        >
          Notify nearby farmers
        </button>
      </div>
    </section>
  );
}
