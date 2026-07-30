import { Module } from "@nestjs/common";
import { AiProviderModule } from "../ai-provider/ai-provider.module";
import { ImagingController } from "./imaging.controller";
import { ImagingService } from "./imaging.service";
import { AuthGuard } from "../auth/auth.guard";
import { SupabaseService } from "../common/supabase.service";
import { AccessLogInterceptor } from "../common/access-log.interceptor";
import { EncryptionService } from "../common/encryption.service";

@Module({
  imports: [AiProviderModule],
  controllers: [ImagingController],
  providers: [ImagingService, AuthGuard, SupabaseService, AccessLogInterceptor, EncryptionService],
})
export class ImagingModule {}
