import { Injectable } from "@nestjs/common";
import { EncryptionService } from "../common/encryption.service";
import { SupabaseService } from "../common/supabase.service";
import { ChatMemoryItemDto, RecentActivityItemDto } from "./dto/chat-memory.dto";

@Injectable()
export class CheckinsMemoryService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  async listMessages(userId: string) {
    const { data, error } = await this.supabase.client
      .from("chat_messages")
      .select("role, encrypted_text, image_uri, urgency, client_created_at")
      .eq("user_id", userId)
      .order("client_created_at", { ascending: true });
    if (isMissingMemoryTable(error)) return [];
    if (error) throw error;
    return (data || []).map((row) => ({
      from: row.role,
      text: this.encryption.decrypt(row.encrypted_text || ""),
      imageUri: row.image_uri || undefined,
      urgency: row.urgency || undefined,
      createdAt: row.client_created_at,
    }));
  }

  async replaceMessages(userId: string, messages: ChatMemoryItemDto[]) {
    const { error: deleteError } = await this.supabase.client
      .from("chat_messages")
      .delete()
      .eq("user_id", userId);
    if (isMissingMemoryTable(deleteError)) return { saved: 0, pendingSchema: true };
    if (deleteError) throw deleteError;

    if (messages.length === 0) return { saved: 0 };

    const rows = messages.map((message, index) => ({
      user_id: userId,
      role: message.from,
      encrypted_text: this.encryption.encrypt(message.text || ""),
      image_uri: message.imageUri || null,
      urgency: message.urgency || null,
      client_created_at: message.createdAt,
      sort_index: index,
    }));

    const { error } = await this.supabase.client.from("chat_messages").insert(rows);
    if (isMissingMemoryTable(error)) return { saved: 0, pendingSchema: true };
    if (error) throw error;
    return { saved: rows.length };
  }

  async deleteMessages(userId: string) {
    const { error } = await this.supabase.client
      .from("chat_messages")
      .delete()
      .eq("user_id", userId);
    if (isMissingMemoryTable(error)) return { deleted: false, pendingSchema: true };
    if (error) throw error;
    return { deleted: true };
  }

  async listRecentActivities(userId: string) {
    const { data, error } = await this.supabase.client
      .from("recent_activities")
      .select("client_id, activity_type, title, detail, route, client_created_at")
      .eq("user_id", userId)
      .order("client_created_at", { ascending: false });
    if (isMissingMemoryTable(error)) return [];
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.client_id,
      type: row.activity_type,
      title: row.title,
      detail: row.detail,
      route: row.route || undefined,
      createdAt: row.client_created_at,
    }));
  }

  async replaceRecentActivities(userId: string, activities: RecentActivityItemDto[]) {
    const { error: deleteError } = await this.supabase.client
      .from("recent_activities")
      .delete()
      .eq("user_id", userId);
    if (isMissingMemoryTable(deleteError)) return { saved: 0, pendingSchema: true };
    if (deleteError) throw deleteError;

    if (activities.length === 0) return { saved: 0 };

    const rows = activities.map((activity, index) => ({
      user_id: userId,
      client_id: activity.id,
      activity_type: activity.type,
      title: activity.title,
      detail: activity.detail,
      route: activity.route || null,
      client_created_at: activity.createdAt,
      sort_index: index,
    }));
    const { error } = await this.supabase.client.from("recent_activities").insert(rows);
    if (isMissingMemoryTable(error)) return { saved: 0, pendingSchema: true };
    if (error) throw error;
    return { saved: rows.length };
  }
}

function isMissingMemoryTable(error: any) {
  return error?.code === "PGRST205" && /chat_messages|recent_activities/i.test(error?.message || "");
}
