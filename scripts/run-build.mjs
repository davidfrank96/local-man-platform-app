import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { devRuntimeLockPath, getActiveRuntimeLock } from "./runtime-lock.mjs";

const activeDevRuntime = getActiveRuntimeLock();

if (activeDevRuntime) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        code: "DEV_RUNTIME_ACTIVE",
        message:
          "Refusing to run next build while the local Next.js dev runtime is active in this workspace.",
        detail:
          "Stop `npm run dev` first, or run the build in a separate workspace if you need both at once.",
        lockPath: devRuntimeLockPath,
        pid: activeDevRuntime.pid,
        startedAt: activeDevRuntime.startedAt,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const nextBinPath = resolve(process.cwd(), "node_modules/next/dist/bin/next");
const child = spawn(process.execPath, [nextBinPath, "build", ...process.argv.slice(2)], {
  cwd: process.cwd(),
  stdio: "inherit",
  env: process.env,
});

child.on("error", (error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        code: "BUILD_START_FAILED",
        message: error.message,
      },
      null,
      2,
    ),
  );
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
