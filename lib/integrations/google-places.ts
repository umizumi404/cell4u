import type { Lead } from "@/lib/domain/schemas";

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
};

const fieldMask = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.internationalPhoneNumber",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
].join(",");

export async function findGooglePlacesLeads({
  campaignId,
  query,
  location,
  maxResults,
}: {
  campaignId: string;
  query: string;
  location: string;
  maxResults: number;
}): Promise<Array<Omit<Lead, "id" | "createdAt" | "updatedAt"> & { rawPlace: GooglePlace }>> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return [];
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify({
      textQuery: `${query} in ${location}`,
      maxResultCount: maxResults,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Places request failed: ${response.status}`);
  }

  const payload = (await response.json()) as { places?: GooglePlace[] };

  return (payload.places ?? [])
    .map((place) => {
      const phone = place.internationalPhoneNumber ?? place.nationalPhoneNumber;

      if (!phone || !place.displayName?.text) {
        return null;
      }

      return {
        campaignId,
        businessName: place.displayName.text,
        phone,
        address: place.formattedAddress ?? null,
        website: place.websiteUri ?? null,
        rating: place.rating ?? null,
        userRatingCount: place.userRatingCount ?? null,
        status: "queued" as const,
        sourcePlaceId: place.id ?? null,
        rawPlace: place,
      };
    })
    .filter((lead): lead is NonNullable<typeof lead> => Boolean(lead))
    .sort((a, b) => Number(Boolean(a.website)) - Number(Boolean(b.website)));
}

export { fieldMask as googlePlacesLeadFieldMask };
