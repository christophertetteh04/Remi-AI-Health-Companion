import { Module } from "@nestjs/common";
import { AdminDashboardController, AdminDashboardRootController } from "./admin-dashboard.controller";

@Module({
  controllers: [AdminDashboardRootController, AdminDashboardController],
})
export class AdminDashboardModule {}
