import { Module } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { SupabaseService } from "../common/supabase.service";

@Module({
  providers: [AuthGuard, SupabaseService],
  exports: [AuthGuard],
})
export class AuthModule {}
