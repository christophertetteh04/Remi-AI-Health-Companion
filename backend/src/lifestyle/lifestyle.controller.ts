import { Body, Controller, Get, Post, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { LifestyleService } from "./lifestyle.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { AccessLogInterceptor } from "../common/access-log.interceptor";
import { LogActivityDto, LogSleepDto, LogSubstanceUseDto, LogWeightDto } from "./dto/lifestyle.dto";

@Controller("lifestyle")
@UseGuards(AuthGuard)
@UseInterceptors(AccessLogInterceptor)
export class LifestyleController {
  constructor(private readonly service: LifestyleService) {}

  @Get()
  async list(@CurrentUserId() userId: string, @Query("type") type: string) {
    return this.service.listForUser(userId, type);
  }

  @Post("sleep")
  async logSleep(@CurrentUserId() userId: string, @Body() body: LogSleepDto) {
    return this.service.log(userId, "sleep", { hours: body.hours, quality: body.quality });
  }

  @Post("activity")
  async logActivity(@CurrentUserId() userId: string, @Body() body: LogActivityDto) {
    return this.service.log(userId, "activity", { activityType: body.activityType, minutes: body.minutes });
  }

  @Post("weight")
  async logWeight(@CurrentUserId() userId: string, @Body() body: LogWeightDto) {
    return this.service.logWeight(userId, body.weightKg, body.heightCm);
  }

  @Post("substance-use")
  async logSubstanceUse(@CurrentUserId() userId: string, @Body() body: LogSubstanceUseDto) {
    return this.service.log(userId, "substance_use", { substance: body.substance, note: body.note });
  }
}
