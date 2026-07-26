import { Module } from "@nestjs/common";
import { MedicationsController } from "./medications.controller";
import { MedicationsService } from "./medications.service";
import { SupabaseService } from "../common/supabase.service";
import { AuthGuard } from "../auth/auth.guard";
import { AccessLogInterceptor } from "../common/access-log.interceptor";

@Module({
  controllers: [MedicationsController],
  providers: [MedicationsService, SupabaseService, AuthGuard, AccessLogInterceptor],
})
export class MedicationsModule {}
