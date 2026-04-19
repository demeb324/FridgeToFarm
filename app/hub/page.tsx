import { HubDashboardShell } from "@/components/hub-dashboard-shell";
import { Navbar } from "@/components/navbar";

export default function HubDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <HubDashboardShell />
      </main>
    </div>
  );
}
