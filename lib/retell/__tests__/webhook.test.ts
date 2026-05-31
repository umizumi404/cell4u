import { describe, expect, it } from "vitest";
import { sign as retellSign } from "retell-sdk";

import { verifyRetellWebhook, WebhookVerificationError } from "../webhook";

const API_KEY = "key_test_1234567890abcdef";

describe("verifyRetellWebhook", () => {
  it("accepts a signature produced by retell-sdk.sign", async () => {
    const body = JSON.stringify({ event: "call_started", call: { call_id: "c1" } });
    const signature = await retellSign(body, API_KEY);
    await expect(
      verifyRetellWebhook({ rawBody: body, signature, apiKey: API_KEY }),
    ).resolves.toBeUndefined();
  });

  it("rejects a tampered body", async () => {
    const body = JSON.stringify({ event: "call_started", call: { call_id: "c1" } });
    const signature = await retellSign(body, API_KEY);
    await expect(
      verifyRetellWebhook({
        rawBody: body + "x",
        signature,
        apiKey: API_KEY,
      }),
    ).rejects.toBeInstanceOf(WebhookVerificationError);
  });

  it("rejects when the signature header is missing", async () => {
    await expect(
      verifyRetellWebhook({
        rawBody: "{}",
        signature: null,
        apiKey: API_KEY,
      }),
    ).rejects.toBeInstanceOf(WebhookVerificationError);
  });

  it("rejects when API key is wrong", async () => {
    const body = JSON.stringify({ event: "call_started" });
    const signature = await retellSign(body, API_KEY);
    await expect(
      verifyRetellWebhook({
        rawBody: body,
        signature,
        apiKey: "key_wrong",
      }),
    ).rejects.toBeInstanceOf(WebhookVerificationError);
  });
});
