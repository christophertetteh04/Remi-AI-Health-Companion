import { Body, Controller, Get, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { EmergencyInfoService } from "./emergency-info.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { AccessLogInterceptor } from "../common/access-log.interceptor";
import { SaveEmergencyInfoDto } from "./dto/emergency-info.dto";

@Controller("emergency-info")
@UseGuards(AuthGuard)
@UseInterceptors(AccessLogInterceptor)
export class EmergencyInfoController {
  constructor(private readonly service: EmergencyInfoService) {}

  // Used on a new/reinstalled device to restore what was previously
  // saved — this is what makes account recovery actually work rather
  // than just being a backup nobody can get back.
  @Get()
  async get(@CurrentUserId() userId: string) {
    return this.service.get(userId);
  }

  @Post()
  async save(
    @CurrentUserId() userId: string,
    @Body() body: SaveEmergencyInfoDto,
  ) {
    return this.service.upsert(userId, body);
  }
}
