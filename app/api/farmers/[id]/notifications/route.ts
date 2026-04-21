import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

function summary(status: string, routeTitle: string) {
  if (status === "sent") return `SMS delivered about "${routeTitle}".`;
  if (status === "failed") return `SMS delivery failed for "${routeTitle}".`;
  return `You're opted out of SMS for "${routeTitle}".`;
}

export async function GET(_request: Request, context: Ctx) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Farmer id must be a UUID." }, { status: 400 });
  }
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("notification_log")
    .select(`
      id, status, created_at,
      routes ( title, hubs ( name ) )
    `)
    .eq("farmer_id", id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const shaped = (data ?? []).map((row) => {
    const r = row.routes as { title: string; hubs: { name: string } | null } | null;
    const hubName = r?.hubs?.name ?? "Hub";
    const routeTitle = r?.title ?? "route";
    return {
      id: row.id,
      sender: hubName,
      timestamp: formatTimestamp(row.created_at),
      message: summary(row.status, routeTitle),
    };
  });
  return NextResponse.json(shaped);
}
