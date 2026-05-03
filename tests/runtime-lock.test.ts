import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import {
  clearRuntimeLock,
  getActiveRuntimeLock,
  isProcessAlive,
  readRuntimeLock,
  runtimeLockBelongsToPid,
  writeRuntimeLock,
} from "../scripts/runtime-lock.mjs";

test("runtime lock tracks the current process safely", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "local-man-runtime-lock-"));
  const lockPath = join(tempDir, "next-dev.lock.json");

  try {
    writeRuntimeLock(
      {
        pid: process.pid,
        command: "next dev",
        cwd: process.cwd(),
        startedAt: "2026-05-03T00:00:00.000Z",
      },
      lockPath,
    );

    assert.equal(isProcessAlive(process.pid), true);
    assert.deepEqual(readRuntimeLock(lockPath), {
      pid: process.pid,
      command: "next dev",
      cwd: process.cwd(),
      startedAt: "2026-05-03T00:00:00.000Z",
    });
    assert.equal(runtimeLockBelongsToPid(process.pid, lockPath), true);
    assert.equal(getActiveRuntimeLock(lockPath)?.pid, process.pid);
  } finally {
    clearRuntimeLock(lockPath);
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("stale runtime lock is cleared automatically", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "local-man-runtime-lock-"));
  const lockPath = join(tempDir, "next-dev.lock.json");

  try {
    writeRuntimeLock(
      {
        pid: 999999,
        command: "next dev",
        cwd: process.cwd(),
        startedAt: "2026-05-03T00:00:00.000Z",
      },
      lockPath,
    );

    assert.equal(getActiveRuntimeLock(lockPath), null);
    assert.equal(existsSync(lockPath), false);
  } finally {
    clearRuntimeLock(lockPath);
    await rm(tempDir, { recursive: true, force: true });
  }
});
