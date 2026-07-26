import { Module } from "@nestjs/common";
import { ConditionsController } from "./conditions.controller";
import { ConditionsService } from "./conditions.service";
import { AuthGuard } from "../auth/auth.guard";
import { SupabaseService } from "../common/supabase.service";
import { AccessLogInterceptor } from "../common/access-log.interceptor";

@Module({
  controllers: [ConditionsController],
  providers: [ConditionsService, AuthGuard, SupabaseService, AccessLogInterceptor],
})
export class ConditionsModule {}
