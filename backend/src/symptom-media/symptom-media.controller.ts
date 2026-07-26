import { Body, Controller, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { SymptomMediaService } from "./symptom-media.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { AccessLogInterceptor } from "../common/access-log.interceptor";

@Controller("symptom-media")
@UseGuards(AuthGuard)
@UseInterceptors(AccessLogInterceptor)
export class SymptomMediaController {
  constructor(private readonly service: SymptomMediaService) {}

  // Stores a symptom photo plus its confirmed body-location tag.
  // The app only ever records WHERE the photo is of — it never
  // attempts to describe or interpret what's visible in the image.
  @Post("upload")
  async upload(
    @CurrentUserId() userId: string,
    @Body("imageBase64") imageBase64: string,
    @Body("bodyLocation") bodyLocation: string,
  ) {
    return this.service.storePhoto(userId, imageBase64, bodyLocation);
  }
}
