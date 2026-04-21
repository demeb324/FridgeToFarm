import { DashboardStatCard } from "@/components/dashboard-stat-card";
import { HeroSection } from "@/components/hero-section";
import { MapPlaceholder } from "@/components/map-placeholder";
import { Navbar } from "@/components/navbar";
import { heroStats } from "@/lib/config/landing";
import type { RoutePlan } from "@/lib/types";

const sampleRoute: RoutePlan = {
  id: "sample",
  title: "Boise North produce run",
  startLocation: "Boise Distribution Hub",
  endLocation: "Treasure Valley Co-op",
  startTime: "Wed 7:00 AM",
  endTime: "Wed 11:30 AM",
  notes: "Compost pickup enabled on the return leg.",
  status: "Open",
  nearbyFarmers: 12,
  pickupRequests: 4,
  stops: [],
};

const hubHighlights = [
  { label: "Nearby growers", value: "—", detail: "Eligible contacts along active route corridors." },
  { label: "Pickup requests", value: "—", detail: "Open farmer responses waiting for dispatch review." },
  { label: "Active trips", value: "—", detail: "Live or upcoming deliveries visible to the operations team." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(240,186,94,0.14),_transparent_30%),linear-gradient(180deg,#f7f4eb_0%,#eef4ec_48%,#f4f7f0_100%)]">
      <Navbar />
      <main>
        <HeroSection />

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {heroStats.map((stat) => (
              <DashboardStatCard key={stat.label} {...stat} />
            ))}
          </div>
        </section>

        <section
          id="how-it-works"
          className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8"
        >
          <div className="space-y-6 rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_30px_80px_-40px_rgba(53,76,52,0.45)] backdrop-blur">
            <div className="inline-flex rounded-full bg-emerald-100 px-4 py-1 text-sm font-semibold text-emerald-800">
              How it works
            </div>
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              A lightweight coordination layer for the roads that already exist.
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { step: "1", title: "Hubs publish routes", body: "Distribution teams log planned trips, destinations, timing, and return capacity." },
                { step: "2", title: "Farmers get alerts", body: "Nearby growers receive simple SMS-style pickup notices with one clear response path." },
                { step: "3", title: "Loads get coordinated", body: "Trips leave fuller, market access improves, and return runs can collect compost inputs." },
              ].map((item) => (
                <div key={item.step} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/90 p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <MapPlaceholder
            title="Route planning preview"
            subtitle="GIS-ready layout for future mapping integration"
            route={sampleRoute}
            compact={false}
          />
        </section>

        <section className="mx-auto grid max-w-7xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-[2rem] border border-amber-100 bg-amber-50/90 p-8 shadow-[0_20px_60px_-45px_rgba(120,81,45,0.7)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
              Farmer experience
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              Low-friction updates that feel familiar, not technical.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              Growers receive SMS-style pickup notices with one clear response path. No logins, no apps — just a link that opens to a simple response page tailored to their farm.
            </p>
          </div>

          <div className="rounded-[2rem] border border-emerald-100 bg-emerald-950 p-8 text-emerald-50 shadow-[0_20px_60px_-45px_rgba(6,78,59,0.9)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">
              Hub operations
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              One screen for route setup, nearby outreach, and pickup demand.
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {hubHighlights.map((stat) => (
                <DashboardStatCard key={stat.label} {...stat} inverted />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
