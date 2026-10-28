import assert from "node:assert/strict";
import { test } from "node:test";
import { applyFastToRequest, createFastState, isFastEligibleModel } from "../lib/fast.ts";

test("Fast is session-only and isolated by model and provider", () => {
  const fast = createFastState();
  const model = { id: "gpt-6.1-terra", provider: "openai" };
  const other = { ...model, provider: "openai-codex" };
  assert.equal(fast.isEnabled(model), false);
  assert.equal(fast.toggle(model), true);
  assert.equal(fast.isEnabled(other), false);
  assert.equal(createFastState().isEnabled(model), false);
  fast.reset();
  assert.equal(fast.isEnabled(model), false);
});

test("OpenAI provider eligibility and request decoration", () => {
  for (const provider of ["openai", "openai-codex"]) assert.equal(isFastEligibleModel({ id: "gpt-6.1-terra", provider } as never), true);
  assert.equal(isFastEligibleModel({ id: "gpt-6.1-terra", provider: "other" } as never), false);
  const body = { model: "gpt-6.1-terra", input: [] };
  assert.equal(applyFastToRequest(body, body.model, false), undefined);
  assert.equal(applyFastToRequest({ ...body, service_tier: "default" }, body.model, true), undefined);
  assert.deepEqual(applyFastToRequest(body, body.model, true), { ...body, service_tier: "priority" });
});
