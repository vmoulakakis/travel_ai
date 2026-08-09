import { getSupabaseAdmin } from "@/lib/data/supabase-admin";

export type GrowthEventName = "social_share" | "stay_selected" | "thematic_guide_download" | "guide_download" | "guide_email_sent" | "final_exit";
export type GrowthChannel = "native" | "clipboard" | "pdf" | "email" | "map" | "tracking" | "unknown";

export async function recordGrowthEvent(input: { sessionId?: string | null; eventName: GrowthEventName; destinationId: string; sourceProductId?: string | null; channel?: GrowthChannel; metadata?: Record<string, unknown> }) {
  const admin = getSupabaseAdmin();
  if (!admin) return false;
  const row = {
    session_id: input.sessionId || null,
    event_name: input.eventName,
    destination_id: input.destinationId,
    source_product_id: input.sourceProductId || null,
    channel: input.channel ?? "unknown",
    metadata: input.metadata ?? {},
  };
  return (await admin.upsert("growth_events", [row])).ok;
}
