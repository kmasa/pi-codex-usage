import { execFile } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const run = promisify(execFile);
for (const provider of ["openai-codex", "openai"]) test(`${provider}: Telegram renders current-model Fast independently of quota and terminal cache`, async () => {
  const dir = mkdtempSync(join(tmpdir(), "codex-telegram-fast-"));
  try {
    await run(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", `
      import assert from "node:assert/strict";
      import { writeFileSync } from "node:fs";
      import { join } from "node:path";
      const { codexUsageTelegramStatusLine: row } = await import(${JSON.stringify(new URL("../lib/telegram.ts", import.meta.url).href)});
      const model = { provider: ${JSON.stringify(provider)}, id: "gpt-5.4", name: "GPT" };
      const report = { snapshots: [{ limitId: "codex", secondary: { usedPercent: 25 } }] };
      const plain = row(report, model);
      assert.ok(plain);
      assert.equal(row(undefined, model), undefined);
      const enabled = candidate => candidate.provider === model.provider && candidate.id === model.id;
      assert.deepEqual(row(report, model, enabled), { ...plain, value: plain.value + " fast" });
      assert.deepEqual(row(undefined, model, enabled), { label: "codex", value: "fast" });
      assert.equal(row(report, { ...model, id: "other" }, enabled).value, plain.value);
      assert.equal(row(report, { ...model, provider: "anthropic" }), undefined);
      assert.equal(row(report, undefined), undefined);
    `], { env: { ...process.env, PI_CODING_AGENT_DIR: dir }, timeout: 15_000 });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
