import { Body, Controller, Get, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { WomensHealthService } from "./womens-health.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { AccessLogInterceptor } from "../common/access-log.interceptor";
import { LogCycleEntryDto, LogMenopauseEntryDto } from "./dto/womens-health.dto";

@Controller("womens-health")
@UseGuards(AuthGuard)
@UseInterceptors(AccessLogInterceptor)
export class WomensHealthController {
  constructor(private readonly service: WomensHealthService) {}

  @Get("cycle")
  async listCycle(@CurrentUserId() userId: string) {
    return this.service.listCycleEntries(userId);
  }

  @Post("cycle")
  async logCycle(
    @CurrentUserId() userId: string,
    @Body() body: LogCycleEntryDto,
  ) {
    return this.service.logCycleEntry(userId, body);
  }

  @Get("menopause")
  async listMenopause(@CurrentUserId() userId: string) {
    return this.service.listMenopauseEntries(userId);
  }

  @Post("menopause")
  async logMenopause(
    @CurrentUserId() userId: string,
    @Body() body: LogMenopauseEntryDto,
  ) {
    return this.service.logMenopauseEntry(userId, body);
  }
}
