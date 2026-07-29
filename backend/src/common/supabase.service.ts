import { Injectable } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseService {
  public client: SupabaseClient;

  constructor() {
    const supabaseUrl = (process.env.SUPABASE_URL || "")
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/\/rest\/v1\/?$/i, "")
      .replace(/\/+$/, "");
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || supabaseUrl.startsWith("your-")) {
      throw new Error(
        'SUPABASE_URL is not set. Add your project URL to backend/.env, for example: SUPABASE_URL="https://your-project-ref.supabase.co"',
      );
    }

    if (supabaseUrl.startsWith("sb_secret_") || supabaseUrl.startsWith("sb_publishable_")) {
      throw new Error(
        'SUPABASE_URL contains an API key, not a URL. In backend/.env, set SUPABASE_URL to your project URL, for example: SUPABASE_URL="https://your-project-ref.supabase.co"',
      );
    }

    if (!serviceRoleKey || serviceRoleKey.startsWith("your-")) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is not set. Add your Supabase Secret key or legacy service_role key to backend/.env.",
      );
    }

    // Service-role key — server-side only, never shipped to the mobile app.
    // Row-level security still applies to any query scoped by user id;
    // this key is used here to let the backend perform the scoping itself.
    this.client = createClient(supabaseUrl, serviceRoleKey);
  }
}
