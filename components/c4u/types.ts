export type Screen =
  | "landing"
  | "onboarding"
  | "deploy"
  | "warroom"
  | "review";

export type AgentState =
  | "queued"
  | "dialing"
  | "ringing"
  | "connected"
  | "pitch"
  | "closing"
  | "closed-won"
  | "closed-lost"
  | "no-answer"
  | "voicemail";

export const STATE_LABELS: Record<AgentState, string> = {
  queued: "Queued",
  dialing: "Dialing",
  ringing: "Ringing",
  connected: "Discovery",
  pitch: "Pitch",
  closing: "Closing",
  "closed-won": "Booked",
  "closed-lost": "Polite no",
  "no-answer": "No answer",
  voicemail: "Voicemail",
};

export type Profile = {
  url: string;
  industry: string;
  icp: string;
  goal: string;
  geo: string;
};

export type Agent = {
  id: number;
  business: string;
  /**
   * Persona archetype id (e.g. "the_offer_stacker"). Sourced from the
   * active blueprint's `persona_set` at dispatch time (Ticket 6/7).
   * Empty string when the tile hasn't been assigned a persona yet.
   */
  archetype: string;
  state: AgentState;
  elapsed: number;
  outcome?: AgentState;
  /** Backend lead id, if this tile was created from a real lead. */
  leadId?: string;
  /** Backend call id, if a real call was placed. */
  callId?: string;
  phone?: string;
};

export type Campaign = {
  id: string;
  url?: string;
  geo?: string;
} | null;
