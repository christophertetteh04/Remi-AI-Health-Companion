import { Body, Controller, Get, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { LabsService } from "./labs.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { AccessLogInterceptor } from "../common/access-log.interceptor";

@Controller("labs")
@UseGuards(AuthGuard)
@UseInterceptors(AccessLogInterceptor)
export class LabsController {
  constructor(private readonly labsService: LabsService) {}

  @Get()
  async list(@CurrentUserId() userId: string) {
    return this.labsService.listForUser(userId);
  }

  // Expects a base64-encoded image (or first page of a PDF rendered
  // as an image) of a lab report. Returns a plain-language
  // explanation plus a comparison to the user's most recent prior
  // report of the same test type, if one exists.
  @Post("upload")
  async upload(@CurrentUserId() userId: string, @Body("imageBase64") imageBase64: string, @Body("mediaType") mediaType: string) {
    return this.labsService.interpretAndCompare(userId, imageBase64, mediaType || "image/jpeg");
  }
}
