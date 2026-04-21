// app/hub/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { HubDashboardShell } from "@/components/hub-dashboard-shell";
import { Navbar } from "@/components/navbar";
import { api } from "@/lib/api/client";

const DEFAULT_HUB_ID = "1e53e9e8-11db-4012-9451-f996632cd250";

function HubPageInner() {
  const hubId = useSearchParams().get("id") ?? DEFAULT_HUB_ID;
  const statsQ = useQuery({ queryKey: ["hubStats", hubId], queryFn: () => api.hubStats(hubId) });
  const routesQ = useQuery({ queryKey: ["routes", hubId], queryFn: () => api.listRoutes(hubId) });

  if (statsQ.isLoading || routesQ.isLoading) return <p className="text-sm">Loading…</p>;
  if (statsQ.isError || routesQ.isError) {
    return (
      <button
        type="button"
        onClick={() => { statsQ.refetch(); routesQ.refetch(); }}
        className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm text-red-800"
      >
        Failed to load. Tap to retry.
      </button>
    );
  }

  return (
    <HubDashboardShell
      stats={statsQ.data!}
      routes={(routesQ.data as Array<{
        id: string; title: string; hubs?: { name?: string } | null;
        start_time: string; end_time: string; start_lat: number; start_lng: number;
        end_lat: number; end_lng: number; notes: string | null; published: boolean;
      }>) ?? []}
    />
  );
}

export default function HubDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Suspense fallback={<p className="text-sm">Loading…</p>}>
          <HubPageInner />
        </Suspense>
      </main>
    </div>
  );
}
