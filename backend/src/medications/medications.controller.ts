import { Body, Controller, Get, Param, Patch, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { MedicationsService } from "./medications.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { CurrentAnalyticsEnabled } from "../auth/current-analytics-enabled.decorator";
import { AccessLogInterceptor } from "../common/access-log.interceptor";
import { CreateMedicationDto, LogMedicationTakenDto, UpdateMedicationDto } from "./dto/medications.dto";

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
    @Body() body: CreateMedicationDto,
  ) {
    return this.medicationsService.create(userId, body);
  }

  @Post(":id/log")
  async logTaken(@CurrentUserId() userId: string, @CurrentAnalyticsEnabled() analyticsEnabled: boolean, @Param("id") id: string, @Body() body: LogMedicationTakenDto) {
    return this.medicationsService.logTaken(userId, id, body.takenAt, analyticsEnabled);
  }

  @Patch(":id")
  async update(@CurrentUserId() userId: string, @Param("id") id: string, @Body() body: UpdateMedicationDto) {
    return this.medicationsService.update(userId, id, body);
  }
}
