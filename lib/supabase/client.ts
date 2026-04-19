import { createClient } from "@supabase/supabase-js";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export function createBrowserSupabaseClient() {
  return createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}
