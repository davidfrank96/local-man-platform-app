import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const devRuntimeLockPath = resolve(
  process.cwd(),
  ".local-man-runtime/next-dev.lock.json",
);

function isValidPid(value) {
  return Number.isInteger(value) && value > 0;
}

export function isProcessAlive(pid) {
  if (!isValidPid(pid)) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function readRuntimeLock(lockPath = devRuntimeLockPath) {
  if (!existsSync(lockPath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(readFileSync(lockPath, "utf8"));

    if (
      !parsed ||
      typeof parsed !== "object" ||
      !isValidPid(parsed.pid) ||
      typeof parsed.command !== "string" ||
      typeof parsed.cwd !== "string" ||
      typeof parsed.startedAt !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function clearRuntimeLock(lockPath = devRuntimeLockPath) {
  if (!existsSync(lockPath)) {
    return;
  }

  rmSync(lockPath, { force: true });
}

export function writeRuntimeLock(lock, lockPath = devRuntimeLockPath) {
  mkdirSync(dirname(lockPath), { recursive: true });
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
}

export function getActiveRuntimeLock(lockPath = devRuntimeLockPath) {
  const lock = readRuntimeLock(lockPath);

  if (!lock) {
    clearRuntimeLock(lockPath);
    return null;
  }

  if (!isProcessAlive(lock.pid)) {
    clearRuntimeLock(lockPath);
    return null;
  }

  return lock;
}

export function runtimeLockBelongsToPid(pid, lockPath = devRuntimeLockPath) {
  const lock = readRuntimeLock(lockPath);
  return Boolean(lock && lock.pid === pid);
}
