import { DriverDashboard } from "@/components/driver-dashboard";
import { Navbar } from "@/components/navbar";
import { driverRouteAssignments, drivers } from "@/lib/mock-data";

export default function DriverPage() {
  return (
    <div className="min-h-screen bg-stone-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <DriverDashboard drivers={drivers} assignments={driverRouteAssignments} />
      </main>
    </div>
  );
}
