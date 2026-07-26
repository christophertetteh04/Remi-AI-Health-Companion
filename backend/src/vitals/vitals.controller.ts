import { Body, Controller, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { VitalsService } from "./vitals.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { AccessLogInterceptor } from "../common/access-log.interceptor";

@Controller("vitals")
@UseGuards(AuthGuard)
@UseInterceptors(AccessLogInterceptor)
export class VitalsController {
  constructor(private readonly vitalsService: VitalsService) {}

  @Post()
  async submit(
    @CurrentUserId() userId: string,
    @Body() reading: { systolic: number; diastolic: number; glucose?: number },
  ) {
    return this.vitalsService.evaluate(userId, reading);
  }
}
