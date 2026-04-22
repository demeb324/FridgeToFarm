"use client";
import { useEffect, useMemo, useState } from "react";
import type { RouteRow, RouteUpdatePayload, RouteCreatePayload, RebroadcastResult } from "@/lib/api/client";
import type { DriverSummary } from "@/lib/api/client";

export type EditorSubmit =
  | { mode: "update"; id: string; payload: RouteUpdatePayload }
  | { mode: "create"; payload: RouteCreatePayload };

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
  fieldError?: { field: string; message: string } | null;
};

type StopInput = { address: string; name: string };

type FormState = {
  title: string;
  driver_id: string;
  start_time: string;
  end_time: string;
  start_address: string;
  end_address: string;
  stops: StopInput[];
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
           start_address: "", end_address: "", stops: [], notes: "" };
}

function stateFromRoute(r: RouteRow, driverId: string): FormState {
  return {
    title: r.title,
    driver_id: driverId,
    start_time: toLocalInput(r.start_time),
    end_time: toLocalInput(r.end_time),
    start_address: r.start_address,
    end_address: r.end_address,
    stops: r.stops.map((s) => ({ address: s.address, name: s.name ?? "" })),
    notes: r.notes ?? "",
  };
}

export function RouteEditor(props: Props) {
  const { mode, route, drivers, onSubmit, onDelete, onCancel, busy, lastRebroadcast, errorMessage, fieldError } = props;

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
      <aside className="flex h-full w-[340px] flex-shrink-0 items-center justify-center border-l border-stone-200 bg-white p-6 text-sm text-stone-500">
        Select a route or create a new one.
      </aside>
    );
  }

  const submit = () => {
    if (mode === "create") {
      onSubmit({
        mode: "create",
        payload: {
          hub_id: route?.hub_id ?? "",
          title: form.title,
          driver_id: form.driver_id,
          start_address: form.start_address,
          end_address: form.end_address,
          stops: form.stops.map((s) => ({ address: s.address, name: s.name || null })),
          start_time: fromLocalInput(form.start_time),
          end_time: fromLocalInput(form.end_time),
          notes: form.notes || null,
        },
      });
      return;
    }
    if (!route) return;
    const payload: RouteUpdatePayload = {
      title: form.title,
      start_address: form.start_address,
      end_address: form.end_address,
      stops: form.stops.map((s) => ({ address: s.address, name: s.name || null })),
      start_time: fromLocalInput(form.start_time),
      end_time: fromLocalInput(form.end_time),
      notes: form.notes || null,
    };
    if (form.driver_id) payload.driver_id = form.driver_id;
    onSubmit({ mode: "update", id: route.id, payload });
  };

  const addStop = () => setForm((s) => ({ ...s, stops: [...s.stops, { address: "", name: "" }] }));
  const removeStop = (i: number) => setForm((s) => ({ ...s, stops: s.stops.filter((_, idx) => idx !== i) }));
  const moveStopUp = (i: number) => setForm((s) => {
    if (i === 0) return s;
    const stops = [...s.stops];
    [stops[i - 1], stops[i]] = [stops[i], stops[i - 1]];
    return { ...s, stops };
  });
  const moveStopDown = (i: number) => setForm((s) => {
    if (i >= s.stops.length - 1) return s;
    const stops = [...s.stops];
    [stops[i], stops[i + 1]] = [stops[i + 1], stops[i]];
    return { ...s, stops };
  });
  const updateStop = (i: number, field: "address" | "name", value: string) =>
    setForm((s) => ({ ...s, stops: s.stops.map((st, idx) => idx === i ? { ...st, [field]: value } : st) }));

  const set = <K extends keyof FormState>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }));

  return (
    <aside className="flex h-full w-[340px] flex-shrink-0 flex-col overflow-y-auto border-l border-stone-200 bg-white p-5">
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

      <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-stone-600">
        Origin address
        <input className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
               value={form.start_address} onChange={set("start_address")}
               placeholder="123 Main St, City, State" />
        {fieldError?.field === "start_address" && (
          <span className="mt-1 block text-xs text-red-600">{fieldError.message}</span>
        )}
      </label>

      <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-stone-600">
        Destination address
        <input className="mt-1 w-full rounded border border-stone-300 px-3 py-2 text-sm"
               value={form.end_address} onChange={set("end_address")}
               placeholder="456 Oak Ave, City, State" />
        {fieldError?.field === "end_address" && (
          <span className="mt-1 block text-xs text-red-600">{fieldError.message}</span>
        )}
      </label>

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-600">Stops</span>
          <button type="button" onClick={addStop}
                  className="rounded border border-stone-300 px-2 py-0.5 text-xs text-stone-700">
            + Add stop
          </button>
        </div>
        {form.stops.map((stop, i) => (
          <div key={i} className="mb-2 flex gap-1 items-start">
            <div className="flex flex-col gap-0.5">
              <button type="button" disabled={i === 0} onClick={() => moveStopUp(i)}
                      className="rounded border px-1 text-xs disabled:opacity-30">↑</button>
              <button type="button" disabled={i === form.stops.length - 1} onClick={() => moveStopDown(i)}
                      className="rounded border px-1 text-xs disabled:opacity-30">↓</button>
            </div>
            <div className="flex-1 space-y-1">
              <input className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
                     placeholder="Stop address"
                     value={stop.address}
                     onChange={(e) => updateStop(i, "address", e.target.value)} />
              <input className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
                     placeholder="Stop name (optional)"
                     value={stop.name}
                     onChange={(e) => updateStop(i, "name", e.target.value)} />
              {fieldError?.field === `stops[${i}].address` && (
                <span className="block text-xs text-red-600">{fieldError.message}</span>
              )}
            </div>
            <button type="button" onClick={() => removeStop(i)}
                    className="mt-1 rounded border border-red-200 px-1.5 py-0.5 text-xs text-red-600">×</button>
          </div>
        ))}
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
