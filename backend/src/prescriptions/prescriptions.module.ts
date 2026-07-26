import { Module } from "@nestjs/common";
import { PrescriptionsController } from "./prescriptions.controller";
import { PrescriptionsService } from "./prescriptions.service";
import { AuthGuard } from "../auth/auth.guard";
import { SupabaseService } from "../common/supabase.service";

@Module({
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, AuthGuard, SupabaseService],
})
export class PrescriptionsModule {}
