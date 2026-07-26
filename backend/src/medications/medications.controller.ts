import { Body, Controller, Get, Param, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { MedicationsService } from "./medications.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { AccessLogInterceptor } from "../common/access-log.interceptor";

@Controller("medications")
@UseGuards(AuthGuard)
@UseInterceptors(AccessLogInterceptor)
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Get()
  async list(@CurrentUserId() userId: string) {
    return this.medicationsService.listForUser(userId);
  }

  @Post()
  async create(
    @CurrentUserId() userId: string,
    @Body() body: { name: string; dose: string; frequency: string; hour?: number; minute?: number; source?: string },
  ) {
    return this.medicationsService.create(userId, body);
  }

  @Post(":id/log")
  async logTaken(@Param("id") id: string, @Body("takenAt") takenAt: string) {
    return this.medicationsService.logTaken(id, takenAt);
  }
}
