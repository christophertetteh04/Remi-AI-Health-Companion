import { Module } from "@nestjs/common";
import { PainCrisesController } from "./pain-crises.controller";
import { PainCrisesService } from "./pain-crises.service";
import { AuthGuard } from "../auth/auth.guard";
import { SupabaseService } from "../common/supabase.service";
import { AccessLogInterceptor } from "../common/access-log.interceptor";
import { EncryptionService } from "../common/encryption.service";

@Module({
  controllers: [PainCrisesController],
  providers: [PainCrisesService, AuthGuard, SupabaseService, AccessLogInterceptor, EncryptionService],
})
export class PainCrisesModule {}
