import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ??
  null;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY ??
  null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let cachedClient: SupabaseClient | null = null;
let fallbackClient: SupabaseClient | null = null;

const createFallbackClient = (): SupabaseClient => {
  if (!fallbackClient) {
    const message =
      "Supabase environment variables are missing. Please set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY).";

    if (process.env.NODE_ENV !== "production") {
      console.warn(message);
    }

    fallbackClient = new Proxy(
      {},
      {
        get() {
          throw new Error(message);
        },
      }
    ) as SupabaseClient;
  }

  return fallbackClient;
};

export const getSupabaseClient = (): SupabaseClient => {
  if (cachedClient) {
    return cachedClient;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return createFallbackClient();
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey);
  return cachedClient;
};
