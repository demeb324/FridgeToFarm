import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ id: string }> };

const DB_TO_UI: Record<string, string> = {
  assigned: "Waiting",
  started: "Started",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Waiting",
};

function formatWindow(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const date = s.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const sTime = s.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const eTime = e.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${date} · ${sTime} - ${eTime}`;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: "Driver id must be a UUID." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("route_assignments")
    .select(`
      id, status, notes,
      routes ( id, title, start_time, end_time, start_lat, start_lng, end_lat, end_lng, notes )
    `)
    .eq("driver_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const shaped = (data ?? []).map((row) => {
    const r = row.routes as {
      id: string; title: string; start_time: string; end_time: string;
      start_lat: number; start_lng: number; end_lat: number; end_lng: number; notes: string | null;
    };
    return {
      id: row.id,
      routeId: r.id,
      routeTitle: r.title,
      pickupSource: `${r.start_lat.toFixed(4)}, ${r.start_lng.toFixed(4)}`,
      destination: `${r.end_lat.toFixed(4)}, ${r.end_lng.toFixed(4)}`,
      pickupWindow: formatWindow(r.start_time, r.end_time),
      material: r.notes ?? "See route notes",
      notes: row.notes ?? "",
      status: DB_TO_UI[row.status] ?? "Waiting",
    };
  });

  return NextResponse.json(shaped);
}
