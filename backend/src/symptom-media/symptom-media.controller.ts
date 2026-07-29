import { Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { SymptomMediaService } from "./symptom-media.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { AccessLogInterceptor } from "../common/access-log.interceptor";
import { UploadSymptomMediaDto } from "./dto/symptom-media.dto";

@Controller("symptom-media")
@UseGuards(AuthGuard)
@UseInterceptors(AccessLogInterceptor)
export class SymptomMediaController {
  constructor(private readonly service: SymptomMediaService) {}

  // Stores a symptom photo plus its confirmed body-location tag.
  // The app only ever records WHERE the photo is of — it never
  // attempts to describe or interpret what's visible in the image.
  @Post("upload")
  @UseInterceptors(FileInterceptor("image"))
  async upload(
    @CurrentUserId() userId: string,
    @Body() body: UploadSymptomMediaDto,
    @UploadedFile() image?: any,
  ) {
    if (image?.buffer) return this.service.storePhotoBuffer(userId, image.buffer, body.bodyLocation);
    return this.service.storePhoto(userId, body.imageBase64, body.bodyLocation);
  }
}
