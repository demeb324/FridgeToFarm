// app/routes/page.tsx
"use client";

import { GoogleRoutePlanner } from "@/components/google-route-planner";
import { Navbar } from "@/components/navbar";
import { DEMO_HUB_ID } from "@/lib/config/demo";
import { routeScenarios } from "@/lib/config/scenarios";

export default function RoutePlanningPage() {
  return (
    <div className="h-screen overflow-hidden bg-[linear-gradient(180deg,#eef3f1_0%,#f5f7f6_100%)]">
      <Navbar />
      <main className="mx-auto flex h-[calc(100vh-76px)] max-w-7xl flex-col overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
        <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="min-h-0 flex-1 overflow-hidden">
            <GoogleRoutePlanner scenarios={routeScenarios} hubId={DEMO_HUB_ID} />
          </div>
        </section>
      </main>
    </div>
  );
}
