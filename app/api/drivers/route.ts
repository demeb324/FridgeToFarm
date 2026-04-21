import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hubId = searchParams.get("hub_id")?.trim();

  if (hubId && !UUID_RE.test(hubId)) {
    return NextResponse.json({ error: "hub_id must be a UUID." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("drivers")
    .select("id, hub_id, first_name, last_name, phone, vehicle, zone, avatar_url")
    .order("first_name", { ascending: true });
  if (hubId) query = query.eq("hub_id", hubId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const shaped = (data ?? []).map((d) => ({
    id: d.id,
    hubId: d.hub_id,
    firstName: d.first_name,
    lastName: d.last_name,
    phone: d.phone,
    vehicle: d.vehicle,
    zone: d.zone,
    avatarUrl: d.avatar_url,
  }));
  return NextResponse.json(shaped);
}
