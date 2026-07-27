import { Body, Controller, Get, Param, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { VitalsService } from "./vitals.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { CurrentAnalyticsEnabled } from "../auth/current-analytics-enabled.decorator";
import { AccessLogInterceptor } from "../common/access-log.interceptor";
import { SubmitVitalsDto } from "./dto/vitals.dto";

@Controller("vitals")
@UseGuards(AuthGuard)
@UseInterceptors(AccessLogInterceptor)
export class VitalsController {
  constructor(private readonly vitalsService: VitalsService) {}

  @Get(":id")
  async get(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.vitalsService.getForUser(userId, id);
  }

  @Post()
  async submit(
    @CurrentUserId() userId: string,
    @CurrentAnalyticsEnabled() analyticsEnabled: boolean,
    @Body() reading: SubmitVitalsDto,
  ) {
    return this.vitalsService.evaluate(userId, reading, analyticsEnabled);
  }
}
