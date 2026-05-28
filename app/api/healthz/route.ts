/**
 * /healthz — liveness + provider-config readiness.
 *
 * Returns 200 with a JSON report of which downstream resources have their
 * env config present. This is intentionally `configured` (env present)
 * not `reachable` (network call) — the endpoint must stay cheap so Vercel
 * health probes don't burn quota.
 */

export const runtime = "edge";

import { NextResponse } from "next/server";

import { DECLARED_VERTICAL_IDS, listBlueprints } from "@/blueprints";

function hasEnv(...names: string[]): boolean {
  return names.every((n) => Boolean(process.env[n]));
}

export async function GET() {
  const enabledVerticals = listBlueprints().map((b) => b.blueprint.vertical_id);

  return NextResponse.json({
    ok: true,
    service: "cell4u",
    time: new Date().toISOString(),
    config: {
      retell: hasEnv("RETELL_API_KEY", "RETELL_WEBHOOK_SECRET", "RETELL_FROM_NUMBER"),
      clay: hasEnv("CLAY_WEBHOOK_URL", "CLAY_WEBHOOK_SECRET"),
      upstash: hasEnv("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"),
      postgres: hasEnv("POSTGRES_URL") || hasEnv("DATABASE_URL"),
      gemini: hasEnv("GEMINI_API_KEY"),
      app_base_url: hasEnv("APP_BASE_URL"),
    },
    blueprints: {
      declared: DECLARED_VERTICAL_IDS,
      enabled: enabledVerticals,
    },
  });
}
