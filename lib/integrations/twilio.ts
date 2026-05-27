import twilio from "twilio";

export function validateTwilioRequest({
  signature,
  url,
  params,
}: {
  signature: string | null;
  url: string;
  params: Record<string, string>;
}) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken || !signature) {
    return false;
  }

  return twilio.validateRequest(authToken, signature, url, params);
}
