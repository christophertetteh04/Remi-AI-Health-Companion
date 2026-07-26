import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../common/supabase.service";

// Standard adult reference ranges — draft values.
// Pregnancy-specific ranges and clinical sign-off are still open
// action items (see flow doc) before this ships to real users.
@Injectable()
export class VitalsService {
  constructor(private readonly supabase: SupabaseService) {}

  async evaluate(userId: string, reading: { systolic: number; diastolic: number; glucose?: number }) {
    let tier: "normal" | "monitor" | "urgent" = "normal";
    let message = "This is within your normal range.";

    if (reading.systolic >= 160 || reading.diastolic >= 110) {
      tier = "urgent";
      message = "This reading is significantly high — please seek care now.";
    } else if (reading.systolic >= 140 || reading.diastolic >= 90) {
      tier = "monitor";
      message = "This is a bit outside the typical range — worth discussing with your doctor soon.";
    }

    await this.supabase.client.from("vitals_readings").insert({
      user_id: userId,
      systolic: reading.systolic,
      diastolic: reading.diastolic,
      glucose: reading.glucose ?? null,
      tier,
    });

    return { tier, message };
  }
}
