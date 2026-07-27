import { Module } from "@nestjs/common";
import { HealthSummaryController } from "./health-summary.controller";
import { HealthSummaryService } from "./health-summary.service";
import { EncryptionService } from "../common/encryption.service";
import { SupabaseService } from "../common/supabase.service";

@Module({
  controllers: [HealthSummaryController],
  providers: [HealthSummaryService, SupabaseService, EncryptionService],
})
export class HealthSummaryModule {}
