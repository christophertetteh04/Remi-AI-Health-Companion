import { Module } from "@nestjs/common";
import { AiProviderModule } from "../ai-provider/ai-provider.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminGuard } from "./admin.guard";
import { SupabaseService } from "../common/supabase.service";

@Module({
  imports: [AiProviderModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard, SupabaseService],
})
export class AdminModule {}
