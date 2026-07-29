import { Module } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { AccessLogInterceptor } from "../common/access-log.interceptor";
import { EncryptionService } from "../common/encryption.service";
import { SupabaseService } from "../common/supabase.service";
import { DocumentClassifierService } from "../document-classifier/document-classifier.service";
import { ImagingService } from "../imaging/imaging.service";
import { LabsService } from "../labs/labs.service";
import { SamplePhotosService } from "../sample-photos/sample-photos.service";
import { SymptomMediaService } from "../symptom-media/symptom-media.service";
import { CheckinsMemoryService } from "./checkins-memory.service";
import { CheckinsController } from "./checkins.controller";
import { CheckinsService } from "./checkins.service";

@Module({
  controllers: [CheckinsController],
  providers: [CheckinsService, CheckinsMemoryService, DocumentClassifierService, LabsService, ImagingService, SymptomMediaService, SamplePhotosService, AuthGuard, AccessLogInterceptor, SupabaseService, EncryptionService],
})
export class CheckinsModule {}
