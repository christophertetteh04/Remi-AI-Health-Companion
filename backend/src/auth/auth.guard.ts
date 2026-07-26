import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { SupabaseService } from "../common/supabase.service";

// Verifies the bearer token the mobile app sends (set after the user
// signs in directly against Supabase Auth on-device). On success,
// attaches the authenticated user's id to the request as req.userId.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing session token");
    }
    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await this.supabase.client.auth.getUser(token);
    if (error || !data.user) {
      throw new UnauthorizedException("Invalid or expired session");
    }
    request.authUserId = data.user.id;

    // Resolve the app-level users.id from the auth user id, creating
    // the profile row on first login if it doesn't exist yet.
    const { data: profile } = await this.supabase.client
      .from("users")
      .select("id")
      .eq("auth_user_id", data.user.id)
      .maybeSingle();

    if (profile) {
      request.userId = profile.id;
    } else {
      const { data: created } = await this.supabase.client
        .from("users")
        .insert({ auth_user_id: data.user.id })
        .select("id")
        .single();
      request.userId = created?.id;
    }

    return true;
  }
}
