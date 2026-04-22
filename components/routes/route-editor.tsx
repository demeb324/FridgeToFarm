"use client";
import { useEffect, useMemo, useState } from "react";
import type { RouteRow, RouteUpdatePayload, RebroadcastResult } from "@/lib/api/client";
import type { DriverSummary } from "@/lib/api/client";

export type EditorSubmit =
  | { mode: "update"; id: string; payload: RouteUpdatePayload }
  | { mode: "create"; payload: Record<string, unknown> };

type Props = {
  mode: "empty" | "view" | "create";
  route?: RouteRow;
  drivers: DriverSummary[];
  onSubmit: (payload: EditorSubmit) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  busy: boolean;
  lastRebroadcast?: RebroadcastResult | null;
  errorMessage?: string | null;
};

type FormState = {
  title: string;
  driver_id: string;
  start_time: string;
  end_time: string;
  start_lat: string;
  start_lng: string;
  end_lat: string;
  end_lng: string;
  notes: string;
};

function toLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function fromLocalInput(v: string): string {
  if (!v) return "";
  return new Date(v).toISOString();
}

function emptyState(): FormState {
  return { title: "", driver_id: "", start_time: "", end_time: "",
           start_lat: "", start_lng: "", end_lat: "", end_lng: "", notes: "" };
}

function stateFromRoute(r: RouteRow, driverId: string): FormState {
  return {
    title: r.title,
    driver_id: driverId,
    start_time: toLocalInput(r.start_time),
    end_time: toLocalInput(r.end_time),
    start_lat: String(r.start_lat),
    start_lng: String(r.start_lng),
    end_lat: String(r.end_lat),
    end_lng: String(r.end_lng),
    notes: r.notes ?? "",
  };
}

export function RouteEditor(props: Props) {
  const { mode, route, drivers, onSubmit, onDelete, onCancel, busy, lastRebroadcast, errorMessage } = props;

  const initial = useMemo(() => {
    if (mode === "view" && route) return stateFromRoute(route, "");
    return emptyState();
  }, [mode, route]);

  const [form, setForm] = useState<FormState>(initial);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const isDirty = useMemo(() => {
    if (mode === "create") return true;
    return JSON.stringify(form) !== JSON.stringify(initial);
  }, [form, initial, mode]);

  if (mode === "empty") {
    return (
      <aside className="flex h-full w-[380px] items-center justify-center border-l border-stone-200 bg-white p-6 text-sm text-stone-500">
        Select a route or create a new one.
      </aside>
    );
  }

  const submit = () => {
    if (mode === "create") {
      onSubmit({
        mode: "create",
        payload: {
          title: form.title,
          driver_id: form.driver_id,
          start_lat: Number(form.start_lat),
          start_lng: Number(form.start_lng),
          end_lat: Number(form.end_lat),
          end_lng: Number(form.end_lng),
          start_time: fromLocalInput(form.start_time),
          end_time: fromLocalInput(form.end_time),
          notes: form.notes || null,
          route_polyline: "placeholder",
        },
      });
      return;
    }
    if (!route) return;
    const payload: RouteUpdatePayload = {
      title: form.title,
      start_lat: Number(form.start_lat),
      start_lng: Number(form.start_lng),
      end_lat: Number(form.end_lat),
      end_lng: Number(form.end_lng),
      start_time: fromLocalInput(form.start_time),
      end_time: fromLocalInput(form.end_time),
      notes: form.notes || null,
    };
    if (form.driver_id) payload.driver_id = form.driver_id;
    onSubmit({ mode: "update", id: route.id, payload });
  };

  const set = <K extends keyof FormState>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }));

  return (
    <aside className="flex h-full w-[380px] flex-col overflow-y-auto border-l border-stone-200 bg-white p-5">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          {mode === "create" ? "New route" : "Edit route"}
        </h2>
        {mode === "view" && route?.published && (
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold uppercase text-emerald-800">
            Published
          </span>
        )}
      </header>

      <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-stone-600">
        Title
        <input className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
               value={form.title} onChange={set("title")} />
      </label>

      <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-stone-600">
        Driver
        <select className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                value={form.driver_id} onChange={set("driver_id")}>
          <option value="">— unassigned —</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
          ))}
        </select>
      </label>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-600">
          Start
          <input type="datetime-local"
                 className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                 value={form.start_time} onChange={set("start_time")} />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-600">
          End
          <input type="datetime-local"
                 className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                 value={form.end_time} onChange={set("end_time")} />
        </label>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-600">
          Start lat
          <input className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                 value={form.start_lat} onChange={set("start_lat")} />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-600">
          Start lng
          <input className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                 value={form.start_lng} onChange={set("start_lng")} />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-600">
          End lat
          <input className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                 value={form.end_lat} onChange={set("end_lat")} />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-stone-600">
          End lng
          <input className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                 value={form.end_lng} onChange={set("end_lng")} />
        </label>
      </div>

      <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-stone-600">
        Notes
        <textarea rows={3}
                  className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
                  value={form.notes} onChange={set("notes")} />
      </label>

      {errorMessage && (
        <p className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">{errorMessage}</p>
      )}

      {lastRebroadcast && (
        <p className="mb-3 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
          Re-broadcast: {lastRebroadcast.farmers_notified} farmer(s) notified.
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <button type="button" onClick={onCancel}
                className="rounded border border-stone-300 px-3 py-2 text-sm text-stone-700">
          Cancel
        </button>
        <div className="flex gap-2">
          {mode === "view" && route && onDelete && (
            <button type="button"
                    disabled={busy}
                    onClick={() => { if (confirm("Delete this route?")) onDelete(route.id); }}
                    className="rounded border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">
              Delete
            </button>
          )}
          <button type="button"
                  disabled={busy || !isDirty}
                  onClick={submit}
                  className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </aside>
  );
}
