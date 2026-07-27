import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { PrescriptionsService } from "./prescriptions.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { CurrentAnalyticsEnabled } from "../auth/current-analytics-enabled.decorator";
import { ScanPrescriptionDto } from "./dto/prescriptions.dto";

@Controller("prescriptions")
@UseGuards(AuthGuard)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  // Expects a base64-encoded image. Returns a DRAFT only — the mobile
  // app must show this to the user for confirmation/correction before
  // anything is saved to medications. See flow doc section 14.
  @Post("scan")
  async scan(@CurrentUserId() userId: string, @CurrentAnalyticsEnabled() analyticsEnabled: boolean, @Body() body: ScanPrescriptionDto) {
    return this.prescriptionsService.extractDraft(userId, body.imageBase64, analyticsEnabled);
  }
}
