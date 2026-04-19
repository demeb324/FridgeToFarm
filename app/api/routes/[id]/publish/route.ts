import { NextResponse } from "next/server";

import { createAdminSupabaseClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Route id is required." }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("routes")
    .update({ published: true })
    .eq("id", id)
    .select("*, hubs ( id, name, phone, email )")
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({
    route: data,
    notifiedFarmers: 0,
    message: "Route published. SMS notifications are not wired yet.",
  });
}
