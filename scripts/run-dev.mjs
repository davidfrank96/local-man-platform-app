import { spawn } from "node:child_process";
import { resolve } from "node:path";
import {
  clearRuntimeLock,
  devRuntimeLockPath,
  getActiveRuntimeLock,
  runtimeLockBelongsToPid,
  writeRuntimeLock,
} from "./runtime-lock.mjs";

const existingLock = getActiveRuntimeLock();

if (existingLock) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        code: "DEV_RUNTIME_ALREADY_ACTIVE",
        message: "A local Next.js dev runtime is already active in this workspace.",
        lockPath: devRuntimeLockPath,
        pid: existingLock.pid,
        startedAt: existingLock.startedAt,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const nextBinPath = resolve(process.cwd(), "node_modules/next/dist/bin/next");
const child = spawn(process.execPath, [nextBinPath, "dev", ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: process.env,
});

if (!child.pid) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        code: "DEV_RUNTIME_START_FAILED",
        message: "Unable to start the local Next.js dev runtime.",
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

writeRuntimeLock(
  {
    pid: child.pid,
    command: "next dev",
    cwd: process.cwd(),
    startedAt: new Date().toISOString(),
  },
  devRuntimeLockPath,
);

function cleanupLock() {
  if (runtimeLockBelongsToPid(child.pid, devRuntimeLockPath)) {
    clearRuntimeLock(devRuntimeLockPath);
  }
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on("error", (error) => {
  cleanupLock();
  console.error(
    JSON.stringify(
      {
        ok: false,
        code: "DEV_RUNTIME_START_FAILED",
        message: error.message,
      },
      null,
      2,
    ),
  );
  process.exit(1);
});

child.on("exit", (code, signal) => {
  cleanupLock();

  if (signal) {
    process.exit(0);
    return;
  }

  process.exit(code ?? 0);
});
