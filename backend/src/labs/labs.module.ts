import { Module } from "@nestjs/common";
import { AiProviderModule } from "../ai-provider/ai-provider.module";
import { LabsController } from "./labs.controller";
import { LabsService } from "./labs.service";
import { AuthGuard } from "../auth/auth.guard";
import { SupabaseService } from "../common/supabase.service";
import { AccessLogInterceptor } from "../common/access-log.interceptor";
import { EncryptionService } from "../common/encryption.service";

@Module({
  imports: [AiProviderModule],
  controllers: [LabsController],
  providers: [LabsService, AuthGuard, SupabaseService, AccessLogInterceptor, EncryptionService],
})
export class LabsModule {}
