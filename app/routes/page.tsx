// app/routes/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { GoogleRoutePlanner } from "@/components/google-route-planner";
import { Navbar } from "@/components/navbar";
import { routeScenarios } from "@/lib/config/scenarios";

const DEFAULT_HUB_ID = "1e53e9e8-11db-4012-9451-f996632cd250";

function RoutePageInner() {
  const hubId = useSearchParams().get("hub") ?? DEFAULT_HUB_ID;
  return <GoogleRoutePlanner scenarios={routeScenarios} hubId={hubId} />;
}

export default function RoutePlanningPage() {
  return (
    <div className="h-screen overflow-hidden bg-[linear-gradient(180deg,#eef3f1_0%,#f5f7f6_100%)]">
      <Navbar />
      <main className="mx-auto flex h-[calc(100vh-76px)] max-w-7xl flex-col overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
        <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="min-h-0 flex-1 overflow-hidden">
            <Suspense fallback={<p className="text-sm">Loading…</p>}>
              <RoutePageInner />
            </Suspense>
          </div>
        </section>
      </main>
    </div>
  );
}
