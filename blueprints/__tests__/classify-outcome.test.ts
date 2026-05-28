import { describe, expect, it } from "vitest";

import type { CallTranscript } from "../_types";
import { b2bLocalServicesAdapter } from "../b2b_local_services/adapter";
import { realEstateAcquisitionAdapter } from "../real_estate_acquisition/adapter";

/**
 * Tests for `classifyOutcome` — invariant-critical (AGENTS.md §6 + v2.2 patch).
 *
 * The three contractual cases the patch explicitly demands:
 *   1. A `book_meeting` tool call -> `kind === "won"`.
 *   2. Objection-only logs -> NOT won.
 *   3. Empty log (no turns, no tool calls) -> NOT won.
 *
 * The same shape is tested against both shipped blueprints because both
 * use `book_meeting` as their `win_condition.success_event`.
 */

function transcript(parts: Partial<CallTranscript> = {}): CallTranscript {
  return {
    callId: parts.callId ?? "call_test",
    turns: parts.turns ?? [],
    toolCalls: parts.toolCalls ?? [],
  };
}

const ADAPTERS = [
  { name: "b2b_local_services", adapter: b2bLocalServicesAdapter },
  { name: "real_estate_acquisition", adapter: realEstateAcquisitionAdapter },
] as const;

describe.each(ADAPTERS)("classifyOutcome ($name)", ({ adapter }) => {
  it("classifies a successful book_meeting tool call as won", () => {
    const result = adapter.classifyOutcome(
      transcript({
        turns: [
          { role: "agent", text: "Hi, calling about ..." },
          { role: "lead", text: "Sure, book me in." },
        ],
        toolCalls: [
          {
            name: "book_meeting",
            arguments: { when: "2026-06-01T15:00:00Z", attendee: "Jane" },
          },
        ],
      }),
    );
    expect(result.kind).toBe("won");
    expect(result.evidence).toMatchObject({ attendee: "Jane" });
  });

  it("does NOT classify objection-only tool calls as won", () => {
    const result = adapter.classifyOutcome(
      transcript({
        turns: [
          { role: "agent", text: "Hi, calling about ..." },
          { role: "lead", text: "Not interested." },
        ],
        toolCalls: [
          {
            name: "log_objection",
            arguments: { classification: "not_interested", reason: "Bad timing" },
          },
        ],
      }),
    );
    expect(result.kind).not.toBe("won");
  });

  it("does NOT classify an empty log as won", () => {
    const result = adapter.classifyOutcome(transcript());
    expect(result.kind).not.toBe("won");
  });
});

/**
 * Additional sanity coverage for the deterministic branches that v0 needs.
 * Not required by the v2.2 patch but cheap given the same fixture shape;
 * leaves the classifier locked-down so a later refactor can't quietly
 * break the tile state machine.
 */
describe("classifyOutcome branch coverage (b2b_local_services)", () => {
  const { classifyOutcome } = b2bLocalServicesAdapter;

  it("returns do_not_call when log_objection logs a DNC", () => {
    expect(
      classifyOutcome(
        transcript({
          turns: [{ role: "lead", text: "Take me off your list." }],
          toolCalls: [
            { name: "log_objection", arguments: { classification: "do_not_call" } },
          ],
        }),
      ).kind,
    ).toBe("do_not_call");
  });

  it("returns callback when log_objection logs a callback", () => {
    expect(
      classifyOutcome(
        transcript({
          turns: [{ role: "lead", text: "Call me tomorrow." }],
          toolCalls: [
            { name: "log_objection", arguments: { classification: "callback" } },
          ],
        }),
      ).kind,
    ).toBe("callback");
  });

  it("returns voicemail when only the agent spoke", () => {
    expect(
      classifyOutcome(
        transcript({
          turns: [
            { role: "agent", text: "Hi, leaving you a message ..." },
          ],
        }),
      ).kind,
    ).toBe("voicemail");
  });

  it("returns no_answer when no turns and no tool calls", () => {
    expect(classifyOutcome(transcript()).kind).toBe("no_answer");
  });

  it("prefers won over a competing objection log (success wins)", () => {
    expect(
      classifyOutcome(
        transcript({
          toolCalls: [
            { name: "log_objection", arguments: { classification: "callback" } },
            { name: "book_meeting", arguments: { when: "later" } },
          ],
        }),
      ).kind,
    ).toBe("won");
  });
});
