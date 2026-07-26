import { Module } from "@nestjs/common";
import { WomensHealthController } from "./womens-health.controller";
import { WomensHealthService } from "./womens-health.service";
import { AuthGuard } from "../auth/auth.guard";
import { SupabaseService } from "../common/supabase.service";
import { AccessLogInterceptor } from "../common/access-log.interceptor";
import { EncryptionService } from "../common/encryption.service";

@Module({
  controllers: [WomensHealthController],
  providers: [WomensHealthService, AuthGuard, SupabaseService, AccessLogInterceptor, EncryptionService],
})
export class WomensHealthModule {}
