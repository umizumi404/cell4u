import { NextResponse } from "next/server";

export async function GET() {
  const clientAccessToken = process.env.WISPR_CLIENT_ACCESS_TOKEN;
  const apiKey = process.env.WISPR_API_KEY;

  if (clientAccessToken) {
    return NextResponse.json({
      configured: true,
      authMode: "client",
      websocketUrl: `wss://platform-api.wisprflow.ai/api/v1/dash/client_ws?client_key=Bearer%20${encodeURIComponent(
        clientAccessToken,
      )}`,
    });
  }

  if (apiKey && process.env.NODE_ENV !== "production") {
    return NextResponse.json({
      configured: true,
      authMode: "api-key-dev",
      websocketUrl: `wss://platform-api.wisprflow.ai/api/v1/dash/ws?api_key=Bearer%20${encodeURIComponent(
        apiKey,
      )}`,
    });
  }

  return NextResponse.json({
    configured: false,
    authMode: null,
    websocketUrl: null,
  });
}
