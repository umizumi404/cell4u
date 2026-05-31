import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { dispatchBatch, isE164, __resetRetellForTests } from "../index";

describe("isE164", () => {
  it("accepts well-formed numbers", () => {
    expect(isE164("+14155550123")).toBe(true);
    expect(isE164("+442071838750")).toBe(true);
  });
  it("rejects non-E.164 strings", () => {
    expect(isE164("4155550123")).toBe(false);
    expect(isE164("+0123")).toBe(false);
    expect(isE164("+1 415 555 0123")).toBe(false);
    expect(isE164("not-a-number")).toBe(false);
  });
});

describe("dispatchBatch", () => {
  const createBatchCall = vi.fn();

  beforeEach(() => {
    createBatchCall.mockReset();
    createBatchCall.mockResolvedValue({ batch_call_id: "batch_xyz" });
    // Cast to unknown to avoid pulling the full Retell SDK shape.
    __resetRetellForTests({
      batchCall: { createBatchCall },
    } as unknown as Parameters<typeof __resetRetellForTests>[0]);
  });
  afterEach(() => {
    __resetRetellForTests(null);
  });

  it("dispatches only E.164 tasks, drops the rest, and reports counts", async () => {
    const result = await dispatchBatch({
      fromNumber: "+14155550000",
      agentId: "agent_b2b",
      tasks: [
        { toNumber: "+14155550001", dynamicVars: { foo: "bar" } },
        { toNumber: "not-a-number" },
        { toNumber: "+14155550002" },
      ],
    });

    expect(result.batchCallId).toBe("batch_xyz");
    expect(result.dispatched).toBe(2);
    expect(result.dropped).toEqual([{ toNumber: "not-a-number", reason: "not E.164" }]);

    expect(createBatchCall).toHaveBeenCalledOnce();
    const arg = createBatchCall.mock.calls[0][0];
    expect(arg.from_number).toBe("+14155550000");
    expect(arg.tasks).toHaveLength(2);
    expect(arg.tasks[0]).toMatchObject({
      to_number: "+14155550001",
      override_agent_id: "agent_b2b",
      retell_llm_dynamic_variables: { foo: "bar" },
    });
  });

  it("rejects an invalid from_number", async () => {
    await expect(
      dispatchBatch({
        fromNumber: "415-555-0000",
        agentId: "agent_b2b",
        tasks: [{ toNumber: "+14155550001" }],
      }),
    ).rejects.toThrow(/E.164/);
    expect(createBatchCall).not.toHaveBeenCalled();
  });

  it("throws when every task is invalid", async () => {
    await expect(
      dispatchBatch({
        fromNumber: "+14155550000",
        agentId: "agent_b2b",
        tasks: [{ toNumber: "bad-1" }, { toNumber: "bad-2" }],
      }),
    ).rejects.toThrow(/No valid tasks/);
    expect(createBatchCall).not.toHaveBeenCalled();
  });
});
