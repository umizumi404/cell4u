/**
 * Blueprint registry.
 *
 * This is the ONLY module allowed to know vertical ids by name. Every other
 * call site receives a `RegisteredBlueprint` (blueprint + adapter pair) from
 * `getBlueprint(verticalId)` or `listBlueprints()` and works against the
 * generic interface (AGENTS.md invariant #5).
 *
 * Adding a vertical = one entry in `BLUEPRINT_MODULES` below. The registry
 * runs `validateBlueprint` at module load on every entry so a malformed
 * blueprint fails fast at import, not at dispatch.
 *
 * Feature flags:
 *   - real_estate_acquisition is gated on
 *     `ENABLE_BLUEPRINT_REAL_ESTATE_ACQUISITION === "true"`
 *     (default off) per PRD §3, until Ticket 5 ships scrubLeads().
 */

import {
  validateBlueprint,
  type RegisteredBlueprint,
} from "./_types";
import { b2bLocalServices } from "./b2b_local_services";
import { realEstateAcquisition } from "./real_estate_acquisition";

export type {
  AudienceKind,
  BlueprintAdapter,
  CallContext,
  CallTranscript,
  CampaignBlueprint,
  CampaignProfile,
  ComplianceProfile,
  DynamicVarField,
  DynamicVarKind,
  DynamicVarSchema,
  Lead,
  NodeOverride,
  Outcome,
  OutcomeKind,
  RegisteredBlueprint,
  SourceLeadsParams,
  WinCondition,
} from "./_types";

export {
  BlueprintContractError,
  DispatchNotReadyError,
  NotImplementedError,
  assertDispatchReady,
  dynamicVarSchemaTypes,
  validateBlueprint,
} from "./_types";

interface BlueprintModule {
  readonly entry: RegisteredBlueprint;
  /** Env var (set to "true") that must be present to enable this blueprint. */
  readonly enableFlag?: string;
}

/**
 * Order matters only for UI listing — pickers should show the canonical
 * demo vertical first.
 */
const BLUEPRINT_MODULES: ReadonlyArray<BlueprintModule> = [
  { entry: b2bLocalServices },
  {
    entry: realEstateAcquisition,
    enableFlag: "ENABLE_BLUEPRINT_REAL_ESTATE_ACQUISITION",
  },
];

function isEnabled(mod: BlueprintModule): boolean {
  if (!mod.enableFlag) return true;
  return process.env[mod.enableFlag] === "true";
}

const REGISTRY: ReadonlyMap<string, RegisteredBlueprint> = (() => {
  const map = new Map<string, RegisteredBlueprint>();
  for (const mod of BLUEPRINT_MODULES) {
    validateBlueprint(mod.entry.blueprint);
    if (!isEnabled(mod)) continue;
    const id = mod.entry.blueprint.vertical_id;
    if (map.has(id)) {
      throw new Error(`Duplicate blueprint vertical_id: "${id}"`);
    }
    map.set(id, mod.entry);
  }
  return map;
})();

/**
 * IDs of all blueprints declared in the codebase, regardless of enablement.
 * Useful for diagnostics and the provisioning script (Ticket 2.5), which
 * needs to publish a flow for every declared vertical even if currently
 * flag-gated.
 */
export const DECLARED_VERTICAL_IDS: ReadonlyArray<string> = BLUEPRINT_MODULES.map(
  (m) => m.entry.blueprint.vertical_id,
);

export function listBlueprints(): ReadonlyArray<RegisteredBlueprint> {
  return Array.from(REGISTRY.values());
}

export function hasBlueprint(verticalId: string): boolean {
  return REGISTRY.has(verticalId);
}

export class UnknownBlueprintError extends Error {
  constructor(verticalId: string, declared: boolean) {
    super(
      declared
        ? `Blueprint "${verticalId}" exists but is disabled. Set its enable flag to "true".`
        : `Unknown blueprint vertical_id: "${verticalId}".`,
    );
    this.name = "UnknownBlueprintError";
  }
}

export function getBlueprint(verticalId: string): RegisteredBlueprint {
  const entry = REGISTRY.get(verticalId);
  if (entry) return entry;
  const declared = DECLARED_VERTICAL_IDS.includes(verticalId);
  throw new UnknownBlueprintError(verticalId, declared);
}

/**
 * Resolve a blueprint by id **ignoring its enable flag**.
 *
 * The runtime/request path must NEVER use this — it bypasses the safety
 * gate that keeps flag-locked verticals (e.g. real_estate_acquisition
 * until scrubLeads is implemented per AGENTS.md invariant #8) dark.
 *
 * Provisioning (Ticket 2.5) is the only legitimate caller: it publishes
 * template flows for every declared vertical so a future flag-flip is
 * zero-friction.
 */
export function getDeclaredBlueprint(verticalId: string): RegisteredBlueprint {
  const mod = BLUEPRINT_MODULES.find(
    (m) => m.entry.blueprint.vertical_id === verticalId,
  );
  if (!mod) throw new UnknownBlueprintError(verticalId, false);
  return mod.entry;
}
