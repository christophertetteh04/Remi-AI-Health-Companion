import { Module } from "@nestjs/common";
import { SymptomMediaController } from "./symptom-media.controller";
import { SymptomMediaService } from "./symptom-media.service";
import { AuthGuard } from "../auth/auth.guard";
import { SupabaseService } from "../common/supabase.service";
import { AccessLogInterceptor } from "../common/access-log.interceptor";
import { EncryptionService } from "../common/encryption.service";

@Module({
  controllers: [SymptomMediaController],
  providers: [SymptomMediaService, AuthGuard, SupabaseService, AccessLogInterceptor, EncryptionService],
})
export class SymptomMediaModule {}
