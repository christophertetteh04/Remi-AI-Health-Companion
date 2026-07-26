import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { PrescriptionsService } from "./prescriptions.service";
import { AuthGuard } from "../auth/auth.guard";

@Controller("prescriptions")
@UseGuards(AuthGuard)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  // Expects a base64-encoded image. Returns a DRAFT only — the mobile
  // app must show this to the user for confirmation/correction before
  // anything is saved to medications. See flow doc section 14.
  @Post("scan")
  async scan(@Body("imageBase64") imageBase64: string) {
    return this.prescriptionsService.extractDraft(imageBase64);
  }
}
