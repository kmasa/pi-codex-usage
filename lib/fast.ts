/** Domain: Codex Fast. Owns: provider semantics and wire adaptation. Excludes: command arbitration and JSONC editing. */
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { isOpenAICodexModel } from "./usage.ts";

type FastModel = Pick<NonNullable<ExtensionContext["model"]>, "provider" | "id">;
export function createFastState() {
  const enabled = new Set<string>();
  const key = (model: FastModel) => JSON.stringify([model.provider, model.id]);
  return {
    isEnabled: (model: FastModel) => enabled.has(key(model)),
    toggle(model: FastModel) {
      const id = key(model);
      if (enabled.has(id)) { enabled.delete(id); return false; }
      enabled.add(id); return true;
    },
    reset: () => enabled.clear(),
  };
}

export function isFastEligibleModel(model: ExtensionContext["model"]): model is NonNullable<ExtensionContext["model"]> {
  return !!model && isOpenAICodexModel(model);
}
export function applyFastToRequest(payload: unknown, modelId: string, enabled: boolean): unknown {
  if (!enabled || !payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const body = payload as Record<string, unknown>;
  if (body.model !== modelId || "service_tier" in body) return undefined;
  return { ...body, service_tier: "priority" };
}
