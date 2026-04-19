function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSupabaseUrl() {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabaseAnonKey() {
  return requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function getSupabaseServiceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

export function getBaseUrl() {
  return process.env.BASE_URL?.trim() || "http://localhost:3000";
}

export function getOpenAiApiKey() {
  return requireEnv("OPENAI_API_KEY");
}

export function getOpenAiVisionModel() {
  return process.env.OPENAI_VISION_MODEL?.trim() || "gpt-5.4-mini";
}
