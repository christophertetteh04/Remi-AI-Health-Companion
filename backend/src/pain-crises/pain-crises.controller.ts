import { Body, Controller, Get, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { PainCrisesService } from "./pain-crises.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { CurrentAnalyticsEnabled } from "../auth/current-analytics-enabled.decorator";
import { AccessLogInterceptor } from "../common/access-log.interceptor";
import { LogPainCrisisDto } from "./dto/pain-crises.dto";

@Controller("pain-crises")
@UseGuards(AuthGuard)
@UseInterceptors(AccessLogInterceptor)
export class PainCrisesController {
  constructor(private readonly service: PainCrisesService) {}

  @Get()
  async list(@CurrentUserId() userId: string) {
    return this.service.listForUser(userId);
  }

  @Post()
  async log(
    @CurrentUserId() userId: string,
    @CurrentAnalyticsEnabled() analyticsEnabled: boolean,
    @Body() body: LogPainCrisisDto,
  ) {
    return this.service.log(userId, body, analyticsEnabled);
  }
}
