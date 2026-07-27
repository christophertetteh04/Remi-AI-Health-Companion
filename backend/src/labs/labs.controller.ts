import { Body, Controller, Get, Param, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { LabsService } from "./labs.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { CurrentAnalyticsEnabled } from "../auth/current-analytics-enabled.decorator";
import { AccessLogInterceptor } from "../common/access-log.interceptor";
import { UploadLabDto } from "./dto/labs.dto";

@Controller("labs")
@UseGuards(AuthGuard)
@UseInterceptors(AccessLogInterceptor)
export class LabsController {
  constructor(private readonly labsService: LabsService) {}

  @Get()
  async list(@CurrentUserId() userId: string) {
    return this.labsService.listForUser(userId);
  }

  @Get(":id")
  async get(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.labsService.getForUser(userId, id);
  }

  // Expects a base64-encoded image (or first page of a PDF rendered
  // as an image) of a lab report. Returns a plain-language
  // explanation plus a comparison to the user's most recent prior
  // report of the same test type, if one exists.
  @Post("upload")
  async upload(@CurrentUserId() userId: string, @CurrentAnalyticsEnabled() analyticsEnabled: boolean, @Body() body: UploadLabDto) {
    return this.labsService.interpretAndCompare(userId, body.imageBase64, body.mediaType || "image/jpeg", analyticsEnabled);
  }
}
