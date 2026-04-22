// app/farmer/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { FarmerOpportunityCard } from "@/components/farmer-opportunity-card";
import { LoadCapacityEstimator } from "@/components/load-capacity-estimator";
import { Navbar } from "@/components/navbar";
import { NotificationCard } from "@/components/notification-card";
import { SidebarNav } from "@/components/sidebar-nav";
import { api } from "@/lib/api/client";
import { DEMO_FARMER_ID } from "@/lib/config/demo";
import type { PickupOpportunity } from "@/lib/types";

function FarmerDashboard() {
  const farmerId = DEMO_FARMER_ID;

  const opportunitiesQ = useQuery({
    queryKey: ["opportunities", farmerId],
    queryFn: () => api.listOpportunities(farmerId),
  });

  const notificationsQ = useQuery({
    queryKey: ["notifications", farmerId],
    queryFn: () => api.listNotifications(farmerId),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
          Upcoming pickup opportunities
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          Nearby routes you can join this week
        </h1>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {opportunitiesQ.isLoading && <p className="text-sm text-slate-600">Loading opportunities…</p>}
        {opportunitiesQ.isError && (
          <button
            type="button"
            onClick={() => opportunitiesQ.refetch()}
            className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            Failed to load opportunities. Tap to retry.
          </button>
        )}
        {opportunitiesQ.data?.length === 0 && (
          <p className="text-sm text-slate-600">No open routes near you right now.</p>
        )}
        {opportunitiesQ.data?.map((o) => {
          const opportunity: PickupOpportunity = {
            id: o.routeId,
            routeName: o.routeTitle,
            farmArea: `${o.distanceMiles} mi away`,
            contactName: o.hubName,
            contactPhone: "",
            pickupWindow: o.pickupWindow,
            destination: o.destination,
            notes: `Date: ${o.routeDate}`,
            status: "Open",
          };
          return <FarmerOpportunityCard key={o.routeId} opportunity={opportunity} />;
        })}
      </section>

      <LoadCapacityEstimator
        role="farmer"
        title="Estimate how much of your pickup bed this load will use"
        description="Snap a photo of produce, compost, or materials waiting for pickup and get a quick visual estimate of how much transport space it may occupy."
      />

      <section className="rounded-[2rem] border border-stone-200 bg-stone-950 p-6 text-stone-50 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">SMS alerts</p>
            <h2 className="mt-2 text-2xl font-semibold">Message feed</h2>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          {notificationsQ.isLoading && <p className="text-sm text-stone-300">Loading messages…</p>}
          {notificationsQ.isError && (
            <button
              type="button"
              onClick={() => notificationsQ.refetch()}
              className="rounded-[1.25rem] border border-red-300 bg-red-950 p-4 text-sm text-red-100"
            >
              Failed to load notifications. Tap to retry.
            </button>
          )}
          {notificationsQ.data?.length === 0 && (
            <p className="text-sm text-stone-300">No messages yet.</p>
          )}
          {notificationsQ.data?.map((n) => (
            <NotificationCard key={n.id} notification={n} dark />
          ))}
        </div>
      </section>
    </div>
  );
}

export default function FarmerDashboardPage() {
  return (
    <div className="min-h-screen bg-stone-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
          <SidebarNav
            title="Farmer view"
            subtitle="Simple pickup coordination"
            items={[
              { href: "/farmer", label: "Opportunities" },
              { href: "/routes", label: "Route planning" },
              { href: "/auth/sign-in", label: "Sign in" },
            ]}
          />
          <FarmerDashboard />
        </div>
      </main>
    </div>
  );
}
