// War-room tile transition simulator.
//
// NOTE: This is intentionally a fake. Real per-call state transitions will
// come from Twilio call-status webhooks in a future iteration. Until then,
// `tickAgent` walks each tile through queued → dialing → ringing → connected
// → pitch → closing → outcome on a deterministic clock. See CLAUDE.md.

import type { Agent, AgentState } from "./types";

const OUTCOMES: AgentState[] = [
  "closed-won",
  "closed-lost",
  "voicemail",
  "no-answer",
];

const TORONTO_BUSINESSES = [
  "Riverside Dental",
  "Brick Lane Coffee",
  "Sunset Auto Body",
  "Maple Studio Yoga",
  "Northside Notary",
  "Harvest Florist",
  "Queen St. Tailor",
  "Bayview Optometry",
  "Forest Hill Bakery",
  "Annex Pet Grooming",
  "Leslie's Drycleaners",
  "Junction Massage",
  "High Park Plumbing",
  "Bloor West Bookshop",
  "Roncesvalles Vet",
  "Don Mills Locksmith",
  "Cabbagetown Salon",
  "East York Hardware",
  "Etobicoke Music",
  "Lakeshore Roofing",
  "Yorkville Picture Framing",
  "Beaches Vintage",
  "King West Print Shop",
  "Liberty Village Cycle",
  "Greenwood Computer Repair",
  "Parkdale Tea",
  "Davenport Cobbler",
  "Christie Pits Driving School",
  "Mount Pleasant Chiropractic",
  "Eglinton Eyewear",
  "Kingsway Auto Glass",
  "Trinity Florist",
  "Wallace Emerson Painting",
  "Dovercourt Notary",
  "Pape Bicycle Co.",
  "Greektown Bakery",
];

const VARIANTS: Agent["variant"][] = ["A", "B", "C", "D"];

export function buildInitialAgents(
  n: number,
  overrides?: Partial<Agent>[],
): Agent[] {
  return Array.from({ length: n }, (_, i) => {
    const override = overrides?.[i];
    return {
      id: i,
      business:
        override?.business ?? TORONTO_BUSINESSES[i % TORONTO_BUSINESSES.length],
      variant: override?.variant ?? VARIANTS[i % VARIANTS.length],
      state: "queued",
      elapsed: 0,
      leadId: override?.leadId,
      callId: override?.callId,
      phone: override?.phone,
    } satisfies Agent;
  });
}

export function tickAgent(a: Agent, t: number): Agent {
  const start = (a.id % 8) * 0.7;
  const cycleT = Math.max(0, t - start);

  let nextState: AgentState = a.state;
  let elapsed = a.elapsed;
  let outcome = a.outcome;

  if (cycleT < 1.5) nextState = "queued";
  else if (cycleT < 3) nextState = "dialing";
  else if (cycleT < 6) nextState = "ringing";
  else if (cycleT < 10) nextState = "connected";
  else if (cycleT < 16) nextState = "pitch";
  else if (cycleT < 19) nextState = "closing";
  else {
    outcome = outcome ?? OUTCOMES[(a.id * 7 + 3) % OUTCOMES.length];
    nextState = outcome;
  }

  if (nextState === "queued" || nextState === "dialing") elapsed = 0;
  else elapsed = Math.floor(cycleT * 8);

  return { ...a, state: nextState, elapsed, outcome };
}
