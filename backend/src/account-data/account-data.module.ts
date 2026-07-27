import { Module } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { SupabaseService } from "../common/supabase.service";
import { AccountDataController } from "./account-data.controller";
import { AccountDataService } from "./account-data.service";

@Module({
  controllers: [AccountDataController],
  providers: [AccountDataService, AuthGuard, SupabaseService],
})
export class AccountDataModule {}
