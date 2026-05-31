/**
 * Ticket 2.5 — provision Retell account resources.
 *
 * Run: `npm run provision` (after RETELL_API_KEY is in .env / .env.local).
 *
 * This script lives OUTSIDE the request path (AGENTS.md invariant #10).
 * It is idempotent: re-running creates a new version of an existing flow
 * (invariant #3) rather than duplicating it. It WILL NOT acquire phone
 * numbers or connect third-party voice providers on your behalf — those
 * actions require auth dances / payment and are surfaced as actionable
 * instructions for the operator instead.
 *
 * Output:
 *   - Updates `scripts/provision/.provisioned.json` (gitignored ledger).
 *   - Prints an env block the operator copies into Vercel + local .env.
 *
 * Flags:
 *   --dry-run   Print the flow JSON payloads + the operator instructions,
 *               but do not call Retell. Useful for type-checking the
 *               authored flow shape.
 */

/* eslint-disable no-console */

import Retell from "retell-sdk";

import {
  DECLARED_VERTICAL_IDS,
  getDeclaredBlueprint,
  hasBlueprint,
} from "../../blueprints";

import { buildAgentParams } from "./agents";
import { flowName, makeRetellClient, preview } from "./client";
import { buildCallFlow, buildIntakeFlow } from "./flows";
import { loadLedger, saveLedger, type ProvisioningLedger } from "./ledger";

const DRY_RUN = process.argv.includes("--dry-run");

const FLOW_ENV_KEY: Record<string, string> = {
  b2b_local_services: "RETELL_FLOW_TEMPLATE_B2B_LOCAL_SERVICES",
  real_estate_acquisition: "RETELL_FLOW_TEMPLATE_REAL_ESTATE_ACQUISITION",
};

const AGENT_ENV_KEY: Record<string, string> = {
  b2b_local_services: "RETELL_AGENT_B2B_LOCAL_SERVICES",
  real_estate_acquisition: "RETELL_AGENT_REAL_ESTATE_ACQUISITION",
};

interface ProvisionedFlow {
  envKey: string;
  flowId: string;
  version: number;
  verticalId: string;
}

interface ProvisionedAgent {
  envKey: string;
  agentId: string;
}

function requireBaseUrl(): string {
  const url = process.env.APP_BASE_URL;
  if (!url) {
    throw new Error(
      "APP_BASE_URL is not set. Provisioning bakes webhook URLs into Retell resources, so this must be the public origin where the app runs (e.g. https://cell4u.vercel.app).",
    );
  }
  return url.replace(/\/+$/, "");
}

/* -------------------------------------------------------------------------- */
/* Flow publishing                                                            */
/* -------------------------------------------------------------------------- */

async function publishFlow(
  client: Retell,
  ledger: ProvisioningLedger,
  ledgerKey: string,
  payload: Retell.ConversationFlowCreateParams,
): Promise<{ id: string; version: number }> {
  const existingId = ledger.flows[ledgerKey]?.id;

  if (existingId) {
    try {
      const current = await client.conversationFlow.retrieve(existingId);
      console.log(
        `  -> updating existing flow ${ledgerKey} (id=${existingId}, current v${current.version})`,
      );
      const updated = await client.conversationFlow.update(existingId, payload);
      return { id: updated.conversation_flow_id, version: updated.version };
    } catch (err) {
      console.warn(
        `  ! ledger pointed at flow ${existingId} but Retell says it's gone (${(err as Error).message}); creating fresh.`,
      );
    }
  }

  console.log(`  -> creating new flow ${ledgerKey}`);
  const created = await client.conversationFlow.create(payload);
  return { id: created.conversation_flow_id, version: created.version };
}

async function provisionCallFlows(
  client: Retell,
  ledger: ProvisioningLedger,
  toolWebhookUrl: string,
): Promise<ProvisionedFlow[]> {
  const out: ProvisionedFlow[] = [];

  for (const verticalId of DECLARED_VERTICAL_IDS) {
    const envKey = FLOW_ENV_KEY[verticalId];
    if (!envKey) {
      console.warn(
        `  ! No env key mapping for vertical "${verticalId}"; skipping (extend FLOW_ENV_KEY in scripts/provision/index.ts).`,
      );
      continue;
    }
    if (!hasBlueprint(verticalId)) {
      console.log(
        `  ~ Blueprint "${verticalId}" is declared but disabled — provisioning the flow anyway so a future flag-flip is zero-friction.`,
      );
    }

    const { blueprint } = getDeclaredBlueprint(verticalId);
    const payload = buildCallFlow({
      verticalId,
      disclosureLine: blueprint.compliance_profile.disclosure_line ?? "",
      successEvent: blueprint.win_condition.success_event,
      defaultArchetype: blueprint.persona_set[0],
      toolWebhookUrl,
    });

    const ledgerKey = flowName(verticalId, "call");
    console.log(`\n[flow] ${ledgerKey}`);
    if (DRY_RUN) {
      console.log(preview(payload, 3));
      out.push({ envKey, flowId: "<dry-run>", version: 0, verticalId });
      continue;
    }

    const result = await publishFlow(client, ledger, ledgerKey, payload);
    ledger.flows[ledgerKey] = { id: result.id, lastPublishedVersion: result.version };
    out.push({ envKey, flowId: result.id, version: result.version, verticalId });
  }

  return out;
}

async function provisionIntakeFlow(
  client: Retell,
  ledger: ProvisioningLedger,
  toolWebhookUrl: string,
): Promise<ProvisionedFlow> {
  const payload = buildIntakeFlow({ toolWebhookUrl });
  const ledgerKey = flowName("intake", "intake");
  console.log(`\n[flow] ${ledgerKey}`);

  if (DRY_RUN) {
    console.log(preview(payload, 3));
    return {
      envKey: "RETELL_FLOW_TEMPLATE_INTAKE",
      flowId: "<dry-run>",
      version: 0,
      verticalId: "intake",
    };
  }

  const result = await publishFlow(client, ledger, ledgerKey, payload);
  ledger.flows[ledgerKey] = { id: result.id, lastPublishedVersion: result.version };
  return {
    envKey: "RETELL_FLOW_TEMPLATE_INTAKE",
    flowId: result.id,
    version: result.version,
    verticalId: "intake",
  };
}

/* -------------------------------------------------------------------------- */
/* Agent provisioning                                                         */
/* -------------------------------------------------------------------------- */

async function publishAgent(
  client: Retell,
  ledger: ProvisioningLedger,
  ledgerKey: string,
  payload: Retell.AgentCreateParams,
): Promise<string> {
  const existingId = ledger.agents[ledgerKey]?.id;

  if (existingId) {
    try {
      await client.agent.retrieve(existingId);
      console.log(`  -> updating existing agent ${ledgerKey} (id=${existingId})`);
      const updated = await client.agent.update(existingId, payload);
      return updated.agent_id;
    } catch (err) {
      console.warn(
        `  ! ledger pointed at agent ${existingId} but Retell says it's gone (${(err as Error).message}); creating fresh.`,
      );
    }
  }

  console.log(`  -> creating new agent ${ledgerKey}`);
  const created = await client.agent.create(payload);
  return created.agent_id;
}

async function provisionAgents(
  client: Retell,
  ledger: ProvisioningLedger,
  flows: ProvisionedFlow[],
  intake: ProvisionedFlow,
  voiceId: string | null,
  eventsWebhookUrl: string,
): Promise<ProvisionedAgent[]> {
  const out: ProvisionedAgent[] = [];

  if (!voiceId && !DRY_RUN) {
    console.log(
      "\n[agents] skipping agent provisioning — voice_id is required and none was detected. Set RETELL_DEFAULT_VOICE_ID manually and re-run.",
    );
    return out;
  }
  const voice = voiceId ?? "<dry-run-voice>";

  for (const flow of flows) {
    const envKey = AGENT_ENV_KEY[flow.verticalId];
    if (!envKey) {
      console.warn(
        `  ! No agent env key for vertical "${flow.verticalId}"; skipping.`,
      );
      continue;
    }
    const ledgerKey = `cell4u/${flow.verticalId}/agent/v1`;
    const payload = buildAgentParams({
      name: `cell4u-${flow.verticalId}`,
      conversationFlowId: flow.flowId,
      voiceId: voice,
      eventsWebhookUrl,
    });
    console.log(`\n[agent] ${ledgerKey}`);
    if (DRY_RUN) {
      console.log(preview(payload, 3));
      out.push({ envKey, agentId: "<dry-run>" });
      continue;
    }
    const agentId = await publishAgent(client, ledger, ledgerKey, payload);
    ledger.agents[ledgerKey] = { id: agentId };
    out.push({ envKey, agentId });
  }

  const intakeKey = `cell4u/intake/agent/v1`;
  const intakePayload = buildAgentParams({
    name: "cell4u-intake",
    conversationFlowId: intake.flowId,
    voiceId: voice,
    eventsWebhookUrl,
  });
  console.log(`\n[agent] ${intakeKey}`);
  if (DRY_RUN) {
    console.log(preview(intakePayload, 3));
    out.push({ envKey: "RETELL_AGENT_INTAKE", agentId: "<dry-run>" });
  } else {
    const intakeAgentId = await publishAgent(
      client,
      ledger,
      intakeKey,
      intakePayload,
    );
    ledger.agents[intakeKey] = { id: intakeAgentId };
    out.push({ envKey: "RETELL_AGENT_INTAKE", agentId: intakeAgentId });
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/* Phone number (detect-only)                                                 */
/* -------------------------------------------------------------------------- */

async function detectFromNumber(
  client: Retell,
  ledger: ProvisioningLedger,
): Promise<string | null> {
  console.log("\n[phone]");

  if (DRY_RUN) {
    console.log(
      "  (dry-run) would list phone numbers on the Retell account and pick the first one.",
    );
    return null;
  }

  let numbers: Retell.PhoneNumberListResponse = [] as unknown as Retell.PhoneNumberListResponse;
  try {
    numbers = await client.phoneNumber.list();
  } catch (err) {
    console.warn(`  ! Could not list phone numbers: ${(err as Error).message}`);
  }

  const arr = Array.isArray(numbers) ? numbers : [];
  if (arr.length === 0) {
    console.log(
      "  ! No phone numbers found on the Retell account.",
    );
    console.log(
      "    -> Provision one in the Retell dashboard (Retell-managed or BYO Twilio).",
    );
    console.log(
      "    -> Then set RETELL_FROM_NUMBER to the chosen E.164 number and re-run.",
    );
    return null;
  }

  const chosen = arr[0].phone_number ?? null;
  ledger.fromNumber = chosen;
  console.log(`  -> using ${chosen} (first number on the account)`);
  if (arr.length > 1) {
    console.log(
      `    (${arr.length - 1} other number(s) on the account; if you want a different one, set RETELL_FROM_NUMBER manually.)`,
    );
  }
  return chosen;
}

/* -------------------------------------------------------------------------- */
/* Voice (detect-only)                                                        */
/* -------------------------------------------------------------------------- */

async function detectDefaultVoice(
  client: Retell,
  ledger: ProvisioningLedger,
): Promise<string | null> {
  console.log("\n[voice]");

  if (DRY_RUN) {
    console.log(
      "  (dry-run) would list voices on the Retell account and pick a Cartesia one.",
    );
    return null;
  }

  let voices: Retell.VoiceListResponse = [] as unknown as Retell.VoiceListResponse;
  try {
    voices = await client.voice.list();
  } catch (err) {
    console.warn(`  ! Could not list voices: ${(err as Error).message}`);
  }

  const arr = Array.isArray(voices) ? voices : [];
  if (arr.length === 0) {
    console.log("  ! No voices configured on the Retell account.");
    console.log(
      "    -> Connect Cartesia in Retell's voice settings (dashboard) and re-run.",
    );
    return null;
  }

  const cartesia = arr.find(
    (v) => v.provider === "cartesia" || /cartesia/i.test(v.voice_name ?? ""),
  );
  const chosen = cartesia ?? arr[0];
  const voiceId = chosen.voice_id ?? null;
  ledger.defaultVoiceId = voiceId;
  console.log(
    `  -> default voice = ${voiceId} (${chosen.voice_name ?? "unnamed"}, provider=${chosen.provider ?? "?"})`,
  );
  if (!cartesia) {
    console.log(
      "    ! No Cartesia voice detected — falling back to the first available voice. Set RETELL_DEFAULT_VOICE_ID manually to a Cartesia voice for invariant #7 compliance.",
    );
  }
  return voiceId;
}

/* -------------------------------------------------------------------------- */
/* Webhook URLs                                                               */
/* -------------------------------------------------------------------------- */

function webhookInfo(eventsUrl: string, toolsUrl: string): void {
  console.log("\n[webhooks]");
  console.log(`  events: ${eventsUrl} (baked into each Agent.webhook_url)`);
  console.log(`  tools:  ${toolsUrl} (baked into each CustomTool.url inside the flows)`);
  console.log(
    "  Retell signs webhook payloads with your RETELL_API_KEY (HMAC-SHA256, 5-min window). No separate webhook secret is required; the runtime verifies via Retell.verify().",
  );
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

async function main(): Promise<void> {
  console.log(`cell4u provisioning — ${DRY_RUN ? "DRY RUN" : "LIVE"}\n`);

  const baseUrl = requireBaseUrl();
  const eventsUrl = `${baseUrl}/api/webhooks/retell/events`;
  const toolsUrl = `${baseUrl}/api/webhooks/retell/tools`;
  console.log(`APP_BASE_URL=${baseUrl}`);

  const client = DRY_RUN ? (null as unknown as Retell) : makeRetellClient();
  const ledger = loadLedger();

  const intake = await provisionIntakeFlow(client, ledger, toolsUrl);
  const callFlows = await provisionCallFlows(client, ledger, toolsUrl);
  const fromNumber = await detectFromNumber(client, ledger);
  const voiceId = await detectDefaultVoice(client, ledger);
  const agents = await provisionAgents(
    client,
    ledger,
    callFlows,
    intake,
    voiceId,
    eventsUrl,
  );
  webhookInfo(eventsUrl, toolsUrl);

  if (!DRY_RUN) {
    saveLedger(ledger);
    console.log("\n[ledger] wrote scripts/provision/.provisioned.json");
  }

  console.log("\n========================================");
  console.log("Paste this into .env.local (and Vercel env):");
  console.log("========================================");
  console.log(`${intake.envKey}=${intake.flowId}`);
  for (const f of callFlows) console.log(`${f.envKey}=${f.flowId}`);
  for (const a of agents) console.log(`${a.envKey}=${a.agentId}`);
  if (fromNumber) console.log(`RETELL_FROM_NUMBER=${fromNumber}`);
  if (voiceId) console.log(`RETELL_DEFAULT_VOICE_ID=${voiceId}`);
  console.log("========================================\n");

  if (!DRY_RUN) {
    const missing: string[] = [];
    if (!fromNumber) missing.push("RETELL_FROM_NUMBER (manual)");
    if (!voiceId) missing.push("RETELL_DEFAULT_VOICE_ID (manual)");
    if (agents.length === 0)
      missing.push("RETELL_AGENT_* (blocked on voice_id; re-run after setting it)");
    if (missing.length > 0) {
      console.warn(
        `Provisioning partially complete. Manual steps remaining: ${missing.join(", ")}.`,
      );
      process.exitCode = 2;
    } else {
      console.log("Provisioning complete.");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
