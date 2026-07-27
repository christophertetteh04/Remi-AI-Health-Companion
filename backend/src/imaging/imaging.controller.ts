import { Body, Controller, Get, Post, UseGuards, UseInterceptors } from "@nestjs/common";
import { ImagingService } from "./imaging.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { AccessLogInterceptor } from "../common/access-log.interceptor";
import { UploadImagingDto } from "./dto/imaging.dto";

@Controller("imaging")
@UseGuards(AuthGuard)
@UseInterceptors(AccessLogInterceptor)
export class ImagingController {
  constructor(private readonly service: ImagingService) {}

  @Get()
  async list(@CurrentUserId() userId: string) {
    return this.service.listForUser(userId);
  }

  // kind is set by the USER, not detected automatically — see
  // planning notes: asking directly is safer than guessing, since
  // a misclassified raw scan being run through the report-explanation
  // path would be exactly the risk we're avoiding.
  @Post("upload")
  async upload(
    @CurrentUserId() userId: string,
    @Body() body: UploadImagingDto,
  ) {
    return this.service.upload(userId, body.imageBase64, body.kind, body.scanType);
  }
}
