import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../common/supabase.service";

@Injectable()
export class EmergencyInfoService {
  constructor(private readonly supabase: SupabaseService) {}

  async get(userId: string) {
    const { data, error } = await this.supabase.client
      .from("emergency_info")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      bloodType: data.blood_type || "",
      allergies: data.allergies_text || "",
      medications: data.medications_text || "",
      contactName: data.emergency_contact_name || "",
      contactPhone: data.emergency_contact_phone || "",
    };
  }

  async upsert(userId: string, info: { bloodType: string; allergies: string; medications: string; contactName: string; contactPhone: string }) {
    const { data, error } = await this.supabase.client
      .from("emergency_info")
      .upsert({
        user_id: userId,
        blood_type: info.bloodType,
        allergies_text: info.allergies,
        medications_text: info.medications,
        emergency_contact_name: info.contactName,
        emergency_contact_phone: info.contactPhone,
      })
      .select();
    if (error) throw error;
    return data;
  }
}
