import { Module } from "@nestjs/common";
import { SamplePhotosController } from "./sample-photos.controller";
import { SamplePhotosService } from "./sample-photos.service";
import { AuthGuard } from "../auth/auth.guard";
import { SupabaseService } from "../common/supabase.service";
import { AccessLogInterceptor } from "../common/access-log.interceptor";
import { EncryptionService } from "../common/encryption.service";

@Module({
  controllers: [SamplePhotosController],
  providers: [SamplePhotosService, AuthGuard, SupabaseService, AccessLogInterceptor, EncryptionService],
})
export class SamplePhotosModule {}
