import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { autocompletePlaces } from "@/lib/services/autocomplete";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input")?.trim() ?? "";

  if (input.length < 3) {
    return NextResponse.json([]);
  }

  const supabase = createAdminSupabaseClient();
  const predictions = await autocompletePlaces(input, supabase);

  return NextResponse.json(predictions);
}
