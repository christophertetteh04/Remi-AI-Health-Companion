import { Body, Controller, Delete, Param, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { SamplePhotosService } from "./sample-photos.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { AccessLogInterceptor } from "../common/access-log.interceptor";

@Controller("sample-photos")
@UseGuards(AuthGuard)
@UseInterceptors(AccessLogInterceptor)
export class SamplePhotosController {
  constructor(private readonly service: SamplePhotosService) {}

  @Post("analyze")
  async analyze(
    @CurrentUserId() userId: string,
    @Body("imageBase64") imageBase64: string,
    @Body("sampleType") sampleType: "urine" | "stool",
  ) {
    return this.service.analyze(userId, imageBase64, sampleType);
  }

  // One-tap delete — this content type gets the strongest, clearest
  // deletion path in the app given how sensitive it is.
  @Delete(":id")
  async remove(@CurrentUserId() userId: string, @Param("id") id: string) {
    return this.service.remove(userId, id);
  }
}
