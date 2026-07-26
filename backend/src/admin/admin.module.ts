import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminGuard } from "./admin.guard";
import { SupabaseService } from "../common/supabase.service";

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminGuard, SupabaseService],
})
export class AdminModule {}
