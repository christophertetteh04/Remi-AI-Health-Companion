import { Body, Controller, Get, Post, Query, Res, UseGuards, UseInterceptors } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUserId } from "../auth/current-user.decorator";
import { AccessLogInterceptor } from "../common/access-log.interceptor";
import { HealthSummaryService } from "./health-summary.service";
import { DoctorPrepDto } from "./dto/health-summary.dto";

@Controller("health-summary")
@UseGuards(AuthGuard)
@UseInterceptors(AccessLogInterceptor)
export class HealthSummaryController {
  constructor(private readonly service: HealthSummaryService) {}

  @Get("timeline")
  async timeline(@CurrentUserId() userId: string, @Query("limit") limit?: string, @Query("offset") offset?: string) {
    return this.service.timeline(userId, Number(limit) || 30, Number(offset) || 0);
  }

  @Get("correlations")
  async correlations(@CurrentUserId() userId: string) {
    return this.service.correlations(userId);
  }

  @Post("doctor-prep")
  async doctorPrep(@CurrentUserId() userId: string, @Body() body: DoctorPrepDto) {
    return this.service.doctorPrep(userId, body?.visitDate, body?.concern);
  }

  @Post("export.pdf")
  async exportPdf(@CurrentUserId() userId: string, @Body() body: DoctorPrepDto, @Res() res: any) {
    const pdf = await this.service.exportPdf(userId, body?.visitDate, body?.concern);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="remi-health-summary.pdf"');
    res.send(pdf);
  }

  @Get("export.pdf")
  async downloadPdf(
    @CurrentUserId() userId: string,
    @Query("visitDate") visitDate: string,
    @Query("concern") concern: string,
    @Res() res: any,
  ) {
    const pdf = await this.service.exportPdf(userId, visitDate, concern);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="remi-health-summary.pdf"');
    res.send(pdf);
  }
}
