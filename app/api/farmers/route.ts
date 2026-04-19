import { NextResponse } from "next/server";

import { asBoolean, asNumber, asString, isLatitude, isLongitude, isRecord } from "@/lib/api/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const name = asString(body.name);
  const phone = asString(body.phone);
  const addressText = asString(body.address_text);
  const latitude = asNumber(body.latitude);
  const longitude = asNumber(body.longitude);
  const optedOut = asBoolean(body.opted_out) ?? false;

  if (!name || !phone || !addressText) {
    return NextResponse.json(
      { error: "name, phone, and address_text are required." },
      { status: 400 },
    );
  }

  if (!isLatitude(latitude) || !isLongitude(longitude)) {
    return NextResponse.json(
      { error: "latitude and longitude must be valid coordinates." },
      { status: 400 },
    );
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("farmers")
    .upsert(
      {
        address_text: addressText,
        latitude,
        longitude,
        name,
        opted_out: optedOut,
        phone,
      },
      {
        onConflict: "phone",
      },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
