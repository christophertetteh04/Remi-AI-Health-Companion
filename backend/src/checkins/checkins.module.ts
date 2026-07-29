import { Module } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { EncryptionService } from "../common/encryption.service";
import { SupabaseService } from "../common/supabase.service";
import { CheckinsMemoryService } from "./checkins-memory.service";
import { CheckinsController } from "./checkins.controller";
import { CheckinsService } from "./checkins.service";

@Module({
  controllers: [CheckinsController],
  providers: [CheckinsService, CheckinsMemoryService, AuthGuard, SupabaseService, EncryptionService],
})
export class CheckinsModule {}
