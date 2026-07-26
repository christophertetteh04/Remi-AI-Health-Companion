import { Module } from "@nestjs/common";
import { LifestyleController } from "./lifestyle.controller";
import { LifestyleService } from "./lifestyle.service";
import { AuthGuard } from "../auth/auth.guard";
import { SupabaseService } from "../common/supabase.service";
import { AccessLogInterceptor } from "../common/access-log.interceptor";
import { EncryptionService } from "../common/encryption.service";

@Module({
  controllers: [LifestyleController],
  providers: [LifestyleService, AuthGuard, SupabaseService, AccessLogInterceptor, EncryptionService],
})
export class LifestyleModule {}
