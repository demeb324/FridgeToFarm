import { FarmerOpportunityCard } from "@/components/farmer-opportunity-card";
import { Navbar } from "@/components/navbar";
import { NotificationCard } from "@/components/notification-card";
import { SidebarNav } from "@/components/sidebar-nav";
import { farmerNotifications, pickupOpportunities } from "@/lib/mock-data";

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

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-700">
                    Upcoming pickup opportunities
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                    Nearby routes you can join this week
                  </h1>
                </div>
                <p className="max-w-md text-sm leading-6 text-slate-600">
                  Designed for growers who need quick answers: who is coming by, when pickup happens, and how to reply.
                </p>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              {pickupOpportunities.map((opportunity) => (
                <FarmerOpportunityCard key={opportunity.id} opportunity={opportunity} />
              ))}
            </section>

            <section className="rounded-[2rem] border border-stone-200 bg-stone-950 p-6 text-stone-50 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">
                    SMS alerts
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">Message feed</h2>
                </div>
                <div className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs text-stone-200">
                  Mocked notifications
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {farmerNotifications.map((notification) => (
                  <NotificationCard key={notification.id} notification={notification} dark />
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
