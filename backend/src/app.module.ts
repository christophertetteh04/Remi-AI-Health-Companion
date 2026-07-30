import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { CheckinsModule } from "./checkins/checkins.module";
import { MedicationsModule } from "./medications/medications.module";
import { VitalsModule } from "./vitals/vitals.module";
import { PrescriptionsModule } from "./prescriptions/prescriptions.module";
import { AdminModule } from "./admin/admin.module";
import { AdminDashboardModule } from "./admin-dashboard/admin-dashboard.module";
import { EmergencyInfoModule } from "./emergency-info/emergency-info.module";
import { SpeechModule } from "./speech/speech.module";
import { LabsModule } from "./labs/labs.module";
import { SymptomMediaModule } from "./symptom-media/symptom-media.module";
import { PharmaciesModule } from "./pharmacies/pharmacies.module";
import { SamplePhotosModule } from "./sample-photos/sample-photos.module";
import { ImagingModule } from "./imaging/imaging.module";
import { ConditionsModule } from "./conditions/conditions.module";
import { PainCrisesModule } from "./pain-crises/pain-crises.module";
import { WomensHealthModule } from "./womens-health/womens-health.module";
import { LifestyleModule } from "./lifestyle/lifestyle.module";
import { HealthSummaryModule } from "./health-summary/health-summary.module";
import { PosthogModule } from "./common/posthog.module";
import { AccountDataModule } from "./account-data/account-data.module";
import { AccountBackupModule } from "./account-backup/account-backup.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Rate limiting: 20 requests per 60s per IP by default across
    // every endpoint. Tune per-route with @Throttle() if a specific
    // endpoint (e.g. the AI check-in) needs a tighter or looser limit.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    PosthogModule,
    CheckinsModule,
    MedicationsModule,
    VitalsModule,
    PrescriptionsModule,
    AdminDashboardModule,
    AdminModule,
    EmergencyInfoModule,
    SpeechModule,
    LabsModule,
    SymptomMediaModule,
    PharmaciesModule,
    SamplePhotosModule,
    ImagingModule,
    ConditionsModule,
    PainCrisesModule,
    WomensHealthModule,
    LifestyleModule,
    HealthSummaryModule,
    AccountDataModule,
    AccountBackupModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
