import type { RoutePlan } from "@/lib/types";

export function MapPlaceholder({
  title,
  subtitle,
  route,
  compact = true,
  expanded = false,
}: {
  title: string;
  subtitle: string;
  route: RoutePlan;
  compact?: boolean;
  expanded?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">{title}</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">{subtitle}</h2>
      </div>

      <div className={`${expanded ? "grid lg:grid-cols-[320px_minmax(0,1fr)]" : "grid lg:grid-cols-[280px_minmax(0,1fr)]"}`}>
        <aside className="border-b border-slate-200 bg-slate-50 p-6 lg:border-b-0 lg:border-r">
          <p className="text-sm font-semibold text-slate-900">{route.title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {route.startLocation} to {route.endLocation}
          </p>
          <div className="mt-5 space-y-3">
            {route.stops.map((stop, index) => (
              <div key={stop} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{stop}</p>
                  <p className="text-xs text-slate-500">
                    {index === route.stops.length - 1 ? "Return-trip compost indicator" : "Planned route stop"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className={`relative overflow-hidden bg-[linear-gradient(135deg,#eff6f2_0%,#dfeae3_100%)] ${compact ? "min-h-[360px]" : "min-h-[480px]"}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.14),transparent_20%),radial-gradient(circle_at_80%_30%,rgba(59,130,246,0.14),transparent_18%),linear-gradient(rgba(255,255,255,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.4)_1px,transparent_1px)] bg-[size:auto,auto,40px_40px,40px_40px]" />

          <div className="relative flex h-full flex-col justify-between p-6">
            <div className="flex justify-between gap-4">
              <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Start</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{route.startLocation}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">End</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{route.endLocation}</p>
              </div>
            </div>

            <div className="absolute left-[18%] top-[28%] rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-lg">
              Start point
            </div>
            <div className="absolute right-[18%] top-[22%] rounded-full bg-amber-500 px-3 py-2 text-xs font-semibold text-white shadow-lg">
              Destination
            </div>
            <div className="absolute left-[36%] top-[44%] rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 shadow-md">
              Farmer pickup cluster
            </div>
            <div className="absolute right-[22%] bottom-[24%] rounded-full border border-lime-200 bg-lime-50 px-3 py-2 text-xs font-semibold text-lime-800 shadow-md">
              Compost return pickup
            </div>

            <svg viewBox="0 0 800 500" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <path
                d="M130 160 C260 130, 320 240, 410 240 S580 140, 660 110"
                stroke="#0f172a"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="18 16"
                opacity="0.8"
              />
              <path
                d="M660 110 C640 210, 560 300, 470 360 S260 380, 190 330"
                stroke="#65a30d"
                strokeWidth="7"
                fill="none"
                strokeLinecap="round"
                opacity="0.7"
              />
            </svg>

            <div className="relative mt-auto grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Nearby farmers</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{route.nearbyFarmers}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pickup requests</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{route.pickupRequests}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Return lane</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">Compost enabled</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
