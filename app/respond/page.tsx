import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { RespondForm } from "./respond-form";

interface RespondPageProps {
  searchParams: Promise<{ route?: string; farmer?: string }>;
}

export default async function RespondPage({ searchParams }: RespondPageProps) {
  const params = await searchParams;
  const routeId = params.route;
  const farmerId = params.farmer;

  if (!routeId || !farmerId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Invalid Link</h1>
          <p className="mt-2 text-slate-600">
            This response link is missing required information. Please contact the hub directly.
          </p>
        </div>
      </div>
    );
  }

  const supabase = createAdminSupabaseClient();

  const { data: routeData } = await supabase
    .from("routes")
    .select("*, hubs ( id, name, phone, email )")
    .eq("id", routeId)
    .single();

  if (!routeData) {
    notFound();
  }

  const { data: farmer } = await supabase
    .from("farmers")
    .select("id, name")
    .eq("id", farmerId)
    .single();

  if (!farmer) {
    notFound();
  }

  const hub = routeData.hubs;
  const startTime = new Date(routeData.start_time).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = new Date(routeData.end_time).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
          Delivery Route Notification
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{routeData.title}</h1>

        <div className="mt-4 space-y-2 text-sm text-slate-600">
          <p><span className="font-medium text-slate-900">Hub:</span> {hub.name}</p>
          <p><span className="font-medium text-slate-900">Farmer:</span> {farmer.name}</p>
          <p><span className="font-medium text-slate-900">Date:</span> {startTime} – {endTime}</p>
          {routeData.notes && (
            <p><span className="font-medium text-slate-900">Notes:</span> {routeData.notes}</p>
          )}
        </div>

        {/* Hub contact card — above the form per spec */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Hub Contact</p>
          <p className="mt-1 text-sm text-slate-700">Phone: {hub.phone}</p>
          <p className="text-sm text-slate-700">Email: {hub.email}</p>
        </div>

        <RespondForm
          routeId={routeId}
          farmerId={farmerId}
          routeTitle={routeData.title}
          hubName={hub.name}
          hubPhone={hub.phone}
          hubEmail={hub.email}
          startTime={startTime}
          endTime={endTime}
          notes={routeData.notes}
        />
      </div>
    </div>
  );
}