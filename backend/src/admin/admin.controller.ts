import { Controller, Get, UseGuards } from "@nestjs/common";
import { AdminGuard } from "./admin.guard";
import { AdminService } from "./admin.service";

@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("users")
  async listUsers() {
    return this.adminService.listUsers();
  }

  @Get("flagged")
  async listFlagged() {
    // Urgent-tier symptom episodes and vitals readings — the
    // quality-control view described in the flow doc: a way to check
    // the escalation logic is actually firing correctly in practice.
    return this.adminService.listFlagged();
  }

  @Get("access-logs")
  async listAccessLogs() {
    return this.adminService.listAccessLogs();
  }

  @Get("provider-incidents")
  async listProviderIncidents() {
    return this.adminService.listProviderIncidents();
  }
}
