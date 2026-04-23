"use client";

import { useState } from "react";
import { DashboardStatCard } from "@/components/dashboard-stat-card";
import { LoadCapacityEstimator } from "@/components/load-capacity-estimator";
import { RouteForm } from "@/components/route-form";
import { SidebarNav } from "@/components/sidebar-nav";
import { StatusBadge } from "@/components/status-badge";
import type { Status } from "@/lib/types";

export type HubRoute = {
  id: string;
  title: string;
  hubs?: { name?: string } | null;
  start_time: string;
  end_time: string;
  start_address: string;
  end_address: string;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  notes: string | null;
  published: boolean;
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function HubDashboardShell({
  stats,
  routes,
}: {
  stats: { nearbyGrowers: number; pickupRequests: number; activeTrips: number };
  routes: HubRoute[];
}) {
  const [selectedRouteId, setSelectedRouteId] = useState(routes[0]?.id ?? "");
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? routes[0];

  const statCards = [
    { label: "Nearby growers", value: String(stats.nearbyGrowers),
      detail: "Eligible contacts along active route corridors." },
    { label: "Pickup requests", value: String(stats.pickupRequests),
      detail: "Open farmer responses waiting for dispatch review." },
    { label: "Active trips", value: String(stats.activeTrips),
      detail: "Live or upcoming deliveries visible to the operations team." },
  ];

  const routeStatus = (r: HubRoute): Status => (r.published ? "Open" : "Draft");

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <SidebarNav
        title="Hub dashboard"
        subtitle="Operations, routing, and farmer outreach"
        items={[
          { href: "/hub", label: "Active routes" },
          { href: "/routes", label: "Planning map" },
          { href: "/auth/sign-up", label: "Invite team" },
        ]}
      />

      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/70 bg-emerald-950 p-6 text-white shadow-[0_30px_80px_-45px_rgba(4,120,87,0.85)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">
                Distribution operations
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Plan routes, notify growers, and track demand.</h1>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {statCards.map((stat) => (
                <DashboardStatCard key={stat.label} {...stat} inverted />
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-6">
          <RouteForm />
          <LoadCapacityEstimator
            role="distributor"
            title="Estimate truck or trailer space before dispatch"
            description="Upload a load photo and compare it against the bed dimensions so your team can quickly judge how much space a route still has left."
          />
        </div>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Active routes</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">Today&apos;s operating board</h2>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {routes.length} routes
              </div>
            </div>

            {routes.length === 0 ? (
              <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                No routes yet. Head to the planning map to create one.
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {routes.map((route) => (
                  <button
                    type="button"
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    className={`rounded-[1.5rem] border p-4 text-left ${
                      route.id === selectedRouteId
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{route.title}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {route.start_address} to {route.end_address}
                        </p>
                      </div>
                      <StatusBadge status={routeStatus(route)} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedRoute ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Route details</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold text-slate-900">{selectedRoute.title}</h2>
                <StatusBadge status={routeStatus(selectedRoute)} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {selectedRoute.start_address} to {selectedRoute.end_address}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Time window</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {fmtTime(selectedRoute.start_time)} to {fmtTime(selectedRoute.end_time)}
                  </p>
                </div>
                <div className="rounded-[1.5rem] bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Operational notes</p>
                  <p className="mt-2 text-sm text-slate-600">{selectedRoute.notes ?? "No notes."}</p>
                </div>
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-dashed border-lime-300 bg-lime-50 p-4">
                <p className="text-sm font-semibold text-lime-900">Return-trip indicator</p>
                <p className="mt-2 text-sm leading-6 text-lime-800">
                  Compost pickup is enabled for this route and will return to growers on the last stop.
                </p>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
