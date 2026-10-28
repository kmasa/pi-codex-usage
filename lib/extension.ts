/** Domain: extension composition. Owns: provider registration, Fast bridge and status wiring. Excludes: shared command ownership. */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { registerFastProvider } from "@llblab/pi-command-fast";
import { applyFastToRequest, createFastState, isFastEligibleModel } from "./fast.ts";
import { createCodexUsageStatus } from "./status.ts";
import { OPENAI_USAGE_PROVIDERS } from "./usage.ts";

export default function codexUsage(pi: ExtensionAPI) {
  const fast = createFastState();
  let releaseFast: Array<() => void> = [];
  pi.on("session_start", (_event, ctx) => {
    fast.reset();
    for (const provider of OPENAI_USAGE_PROVIDERS) {
      releaseFast.push(registerFastProvider(pi, ctx, {
        provider,
        toggle(commandCtx) {
          fast.toggle(commandCtx.model!);
          status.fastChanged(commandCtx, commandCtx.model!);
        },
      }));
    }
  });
  pi.on("session_shutdown", () => { releaseFast.forEach((release) => release()); releaseFast = []; });
  const status = createCodexUsageStatus(pi, fast.isEnabled);
  pi.on("before_provider_request", (event, ctx) => {
    const model = ctx.model;
    if (!isFastEligibleModel(model)) return;
    return applyFastToRequest(event.payload, model.id, fast.isEnabled(model));
  });
}
