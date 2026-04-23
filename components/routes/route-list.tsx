"use client";
import type { RouteRow } from "@/lib/api/client";
import { routeColor } from "@/lib/routes/route-color";

type Props = {
  routes: RouteRow[];
  selectedId: string | null;
  mode: "view" | "create";
  onSelect: (id: string) => void;
  onCreateNew: () => void;
};

function formatShortTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
}

export function RouteList({ routes, selectedId, mode, onSelect, onCreateNew }: Props) {
  const sorted = [...routes].sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <aside className="flex h-full w-[320px] flex-shrink-0 flex-col border-r border-stone-200 bg-white">
      <button
        type="button"
        onClick={onCreateNew}
        className={`m-3 rounded-[1rem] border border-dashed px-3 py-2 text-sm font-semibold ${
          mode === "create"
            ? "border-amber-500 bg-amber-50 text-amber-900"
            : "border-stone-300 text-stone-700 hover:border-stone-400"
        }`}
      >
        + New route
      </button>
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 && (
          <p className="px-4 py-6 text-sm text-stone-500">No routes yet.</p>
        )}
        {sorted.map((route) => {
          const active = route.id === selectedId && mode === "view";
          return (
            <button
              type="button"
              key={route.id}
              onClick={() => onSelect(route.id)}
              className={`flex w-full items-start gap-3 border-b border-stone-100 px-4 py-3 text-left transition ${
                active ? "bg-stone-100" : "hover:bg-stone-50"
              }`}
            >
              <span
                aria-hidden
                className="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: routeColor(route.id) }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">{route.title}</span>
                <span className="mt-1 flex items-center gap-2 text-xs text-stone-600">
                  <span>{formatShortTime(route.start_time)}</span>
                  {route.published && (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
                      Published
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
