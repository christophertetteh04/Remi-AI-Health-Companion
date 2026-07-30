import { Module } from "@nestjs/common";
import { AccountBackupController } from "./account-backup.controller";
import { AccountBackupService } from "./account-backup.service";
import { EncryptionService } from "../common/encryption.service";
import { SupabaseService } from "../common/supabase.service";

@Module({
  controllers: [AccountBackupController],
  providers: [AccountBackupService, SupabaseService, EncryptionService],
})
export class AccountBackupModule {}
