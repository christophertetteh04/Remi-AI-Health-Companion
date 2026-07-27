// PRIVACY RULE: never send symptom descriptions, lab explanations, medication names,
// chat messages, or any other free-text health content to PostHog. Only event names
// and categorical properties like tier, condition, or screen name are allowed.
import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PostHog } from "posthog-node";

type AnalyticsEvent =
  | "medication_marked_taken"
  | "vitals_logged"
  | "lab_report_uploaded"
  | "prescription_scanned"
  | "crisis_protocol_triggered"
  | "condition_tracking_enabled";

type AnalyticsProperties = {
  tier?: "normal" | "monitor" | "urgent";
  condition?: string;
};

@Injectable()
export class PosthogService implements OnModuleDestroy {
  private readonly client = process.env.POSTHOG_API_KEY
    ? new PostHog(process.env.POSTHOG_API_KEY, {
        host: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
      })
    : null;

  capture(userId: string, event: AnalyticsEvent, properties?: AnalyticsProperties, analyticsEnabled = true) {
    if (!analyticsEnabled || !this.client) return;
    this.client.capture({ distinctId: userId, event, properties });
  }

  async onModuleDestroy() {
    await this.client?.shutdown();
  }
}
