import { Module } from "@nestjs/common";
import { EmergencyInfoController } from "./emergency-info.controller";
import { EmergencyInfoService } from "./emergency-info.service";
import { AuthGuard } from "../auth/auth.guard";
import { SupabaseService } from "../common/supabase.service";
import { AccessLogInterceptor } from "../common/access-log.interceptor";

@Module({
  controllers: [EmergencyInfoController],
  providers: [EmergencyInfoService, AuthGuard, SupabaseService, AccessLogInterceptor],
})
export class EmergencyInfoModule {}
