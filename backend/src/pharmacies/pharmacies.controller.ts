import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { PharmaciesService } from "./pharmacies.service";
import { AuthGuard } from "../auth/auth.guard";

@Controller("pharmacies")
@UseGuards(AuthGuard)
export class PharmaciesController {
  constructor(private readonly service: PharmaciesService) {}

  @Get("nearby")
  async nearby(@Query("lat") lat: string, @Query("lng") lng: string) {
    return this.service.findNearby(Number(lat), Number(lng));
  }
}
