import { NextResponse } from "next/server";
import { findLeadsRequestSchema } from "@/lib/domain/schemas";
import { findGooglePlacesLeads } from "@/lib/integrations/google-places";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const input = findLeadsRequestSchema.parse(await request.json());
  const leads = await findGooglePlacesLeads(input);

  if (leads.length === 0) {
    return NextResponse.json({ mode: "preview", leads: [] });
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("leads")
      .upsert(
        leads.map((lead) => ({
          campaign_id: lead.campaignId,
          business_name: lead.businessName,
          phone: lead.phone,
          address: lead.address,
          website: lead.website,
          rating: lead.rating,
          user_rating_count: lead.userRatingCount,
          status: lead.status,
          source_place_id: lead.sourcePlaceId,
          raw_place: lead.rawPlace,
        })),
        { onConflict: "campaign_id,source_place_id" },
      )
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json({ mode: "live", leads: data });
  } catch (error) {
    return NextResponse.json({
      mode: "preview",
      leads,
      warning:
        error instanceof Error
          ? error.message
          : "Supabase is not configured; returned Google Places leads only.",
    });
  }
}
