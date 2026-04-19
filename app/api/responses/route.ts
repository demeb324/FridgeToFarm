import { NextResponse } from "next/server";

import { asString, isRecord } from "@/lib/api/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const VALID_RESPONSE_TYPES = new Set(["crop_pickup", "compost_pickup", "both"]);
const VALID_STATUSES = new Set(["pending", "confirmed", "cancelled"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const routeId = asString(body.route_id);
  const farmerId = asString(body.farmer_id);
  const responseType = asString(body.response_type);
  const notes = asString(body.notes);
  const status = asString(body.status) || "pending";

  if (!routeId || !farmerId || !responseType) {
    return NextResponse.json(
      { error: "route_id, farmer_id, and response_type are required." },
      { status: 400 },
    );
  }

  if (!VALID_RESPONSE_TYPES.has(responseType)) {
    return NextResponse.json({ error: "response_type is invalid." }, { status: 400 });
  }

  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "status is invalid." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("route_responses")
    .upsert(
      {
        farmer_id: farmerId,
        notes: notes || null,
        response_type: responseType as "crop_pickup" | "compost_pickup" | "both",
        route_id: routeId,
        status: status as "pending" | "confirmed" | "cancelled",
      },
      {
        onConflict: "route_id,farmer_id",
      },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
