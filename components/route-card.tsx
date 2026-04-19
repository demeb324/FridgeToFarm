import type { PickupOpportunity } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";

export function RouteCard({
  route,
  actionLabel,
}: {
  route: PickupOpportunity;
  actionLabel?: string;
}) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{route.routeName}</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">{route.destination}</h3>
        </div>
        <StatusBadge status={route.status} />
      </div>

      <div className="mt-5 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <p className="font-semibold text-slate-900">Pickup window</p>
          <p className="mt-1">{route.pickupWindow}</p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Hub contact</p>
          <p className="mt-1">
            {route.contactName} · {route.contactPhone}
          </p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Near farm</p>
          <p className="mt-1">{route.farmArea}</p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">Notes</p>
          <p className="mt-1">{route.notes}</p>
        </div>
      </div>

      {actionLabel ? (
        <button
          type="button"
          className="mt-5 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:-translate-y-0.5 hover:bg-slate-700"
        >
          {actionLabel}
        </button>
      ) : null}
    </article>
  );
}
