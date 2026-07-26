import { Module } from "@nestjs/common";
import { VitalsController } from "./vitals.controller";
import { VitalsService } from "./vitals.service";
import { SupabaseService } from "../common/supabase.service";
import { AuthGuard } from "../auth/auth.guard";
import { AccessLogInterceptor } from "../common/access-log.interceptor";

@Module({
  controllers: [VitalsController],
  providers: [VitalsService, SupabaseService, AuthGuard, AccessLogInterceptor],
})
export class VitalsModule {}
