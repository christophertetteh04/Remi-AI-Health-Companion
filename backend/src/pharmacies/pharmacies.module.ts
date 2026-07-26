import { Module } from "@nestjs/common";
import { PharmaciesController } from "./pharmacies.controller";
import { PharmaciesService } from "./pharmacies.service";
import { AuthGuard } from "../auth/auth.guard";
import { SupabaseService } from "../common/supabase.service";

@Module({
  controllers: [PharmaciesController],
  providers: [PharmaciesService, AuthGuard, SupabaseService],
})
export class PharmaciesModule {}
