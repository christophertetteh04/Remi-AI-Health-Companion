import { Body, Controller, Get, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { ConditionsService } from "./conditions.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { AccessLogInterceptor } from "../common/access-log.interceptor";

@Controller("conditions")
@UseGuards(AuthGuard)
@UseInterceptors(AccessLogInterceptor)
export class ConditionsController {
  constructor(private readonly service: ConditionsService) {}

  @Get()
  async list(@CurrentUserId() userId: string) {
    return this.service.listForUser(userId);
  }

  // User explicitly opts INTO tracking a condition — nothing is
  // auto-enabled. See flow doc: "wants to opt into tracking a
  // specific chronic condition."
  @Post("toggle")
  async toggle(@CurrentUserId() userId: string, @Body("condition") condition: string, @Body("enabled") enabled: boolean) {
    return this.service.toggle(userId, condition, enabled);
  }
}
