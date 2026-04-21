import { NextResponse } from "next/server";
import { asString, isRecord } from "@/lib/api/validation";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const UI_TO_DB: Record<string, string> = {
  Waiting: "assigned",
  Started: "started",
  "In Progress": "in_progress",
  Completed: "completed",
};
const DB_TO_UI: Record<string, string> = {
  assigned: "Waiting",
  started: "Started",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Waiting",
};

type Ctx = { params: Promise<{ id: string; assignmentId: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const { id, assignmentId } = await context.params;
  if (!UUID_RE.test(id) || !UUID_RE.test(assignmentId)) {
    return NextResponse.json({ error: "id and assignmentId must be UUIDs." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!isRecord(body)) {
    return NextResponse.json({ error: "Body must be a JSON object." }, { status: 400 });
  }
  const uiStatus = asString(body.status);
  const dbStatus = UI_TO_DB[uiStatus];
  if (!dbStatus) {
    return NextResponse.json(
      { error: `status must be one of: ${Object.keys(UI_TO_DB).join(", ")}.` },
      { status: 400 },
    );
  }

  const supabase = createAdminSupabaseClient();
  const { data: existing, error: exErr } = await supabase
    .from("route_assignments")
    .select("id, driver_id")
    .eq("id", assignmentId)
    .maybeSingle();
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
  if (!existing || existing.driver_id !== id) {
    return NextResponse.json({ error: "Assignment not found for this driver." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("route_assignments")
    .update({ status: dbStatus, updated_at: new Date().toISOString() })
    .eq("id", assignmentId)
    .select("id, status")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id, status: DB_TO_UI[data.status] });
}
