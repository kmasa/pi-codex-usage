import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { resolveCodexExecutable } from "../lib/query.ts";

function fixture(run: (dir: string, file: (path: string) => string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "codex-launcher-"));
  const file = (path: string) => {
    const full = join(dir, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, "");
    return full;
  };
  try {
    run(dir, file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("non-Windows platforms keep plain Codex PATH lookup", () => {
  assert.equal(resolveCodexExecutable("linux", {}), "codex");
  assert.equal(resolveCodexExecutable("darwin", {}), "codex");
});

test("Windows prefers a native codex.exe on PATH", () =>
  fixture((dir, file) => {
    const first = file("first/codex.exe");
    file("second/codex.exe");
    assert.equal(
      resolveCodexExecutable("win32", { Path: `;"${dirname(first)}";${join(dir, "second")}` }),
      first,
    );
  }));

test("Windows resolves the npm platform-package binary behind codex.cmd", () =>
  fixture((dir, file) => {
    file("prefix/codex.cmd");
    const binary = file(
      "prefix/node_modules/@openai/codex/node_modules/@openai/codex-win32-arm64/vendor/aarch64-pc-windows-msvc/bin/codex.exe",
    );
    assert.equal(resolveCodexExecutable("win32", { PATH: join(dir, "prefix") }, "arm64"), binary);
  }));

test("Windows resolves a hoisted npm platform-package binary", () =>
  fixture((dir, file) => {
    file("prefix/codex.cmd");
    const binary = file(
      "prefix/node_modules/@openai/codex-win32-x64/vendor/x86_64-pc-windows-msvc/bin/codex.exe",
    );
    assert.equal(resolveCodexExecutable("win32", { Path: join(dir, "prefix") }, "x64"), binary);
  }));

test("Windows without a native Codex fails with recovery instructions", () =>
  fixture((dir, file) => {
    file("prefix/codex.cmd");
    assert.throws(
      () => resolveCodexExecutable("win32", { PATH: join(dir, "prefix") }, "x64"),
      /Install Codex.*restart Pi/,
    );
    assert.throws(() => resolveCodexExecutable("win32", {}), /Could not find a native Codex executable/);
  }));
