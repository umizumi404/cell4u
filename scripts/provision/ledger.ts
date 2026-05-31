/**
 * Local ledger of provisioned Retell resources.
 *
 * Retell's Conversation Flow resource has no `name` field we can use as a
 * stable lookup key, so we keep a small JSON file recording the resource
 * ids we've created. On re-run, the script consults this ledger first:
 *   - id present + Retell `retrieve(id)` succeeds  -> update (versions per
 *     AGENTS.md invariant #3) instead of create.
 *   - id present + Retell `retrieve(id)` 404s      -> ledger is stale,
 *     create fresh and overwrite the entry.
 *   - id missing                                   -> create.
 *
 * The ledger is gitignored. It is a convenience record; the source of
 * truth is the Retell account itself.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const LEDGER_PATH = resolve(process.cwd(), "scripts/provision/.provisioned.json");

export interface ProvisioningLedger {
  flows: Partial<Record<string, { id: string; lastPublishedVersion?: number }>>;
  agents: Partial<Record<string, { id: string; version?: number }>>;
  fromNumber?: string | null;
  defaultVoiceId?: string | null;
  lastRunAt?: string;
}

const EMPTY: ProvisioningLedger = { flows: {}, agents: {} };

export function loadLedger(): ProvisioningLedger {
  if (!existsSync(LEDGER_PATH)) return { ...EMPTY };
  try {
    const raw = readFileSync(LEDGER_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<ProvisioningLedger>;
    return {
      ...EMPTY,
      ...parsed,
      flows: { ...EMPTY.flows, ...(parsed.flows ?? {}) },
      agents: { ...EMPTY.agents, ...(parsed.agents ?? {}) },
    };
  } catch (err) {
    console.warn(
      `[provision] Could not parse ${LEDGER_PATH}; starting fresh. (${(err as Error).message})`,
    );
    return { ...EMPTY };
  }
}

export function saveLedger(ledger: ProvisioningLedger): void {
  mkdirSync(dirname(LEDGER_PATH), { recursive: true });
  writeFileSync(
    LEDGER_PATH,
    JSON.stringify({ ...ledger, lastRunAt: new Date().toISOString() }, null, 2),
    "utf8",
  );
}
