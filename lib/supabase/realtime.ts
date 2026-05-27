"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function useCampaignRealtime(campaignId: string | null) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!campaignId || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return;
    }

    const supabase = createClient();
    let channel: RealtimeChannel | null = supabase
      .channel(`campaign:${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => setVersion((current) => current + 1),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "calls",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => setVersion((current) => current + 1),
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, [campaignId]);

  return version;
}
