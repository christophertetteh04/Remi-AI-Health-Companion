import { Body, Controller, Get, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { PainCrisesService } from "./pain-crises.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { AccessLogInterceptor } from "../common/access-log.interceptor";

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
    @Body() body: { severity: number; triggerNote: string; location: string },
  ) {
    return this.service.log(userId, body);
  }
}
