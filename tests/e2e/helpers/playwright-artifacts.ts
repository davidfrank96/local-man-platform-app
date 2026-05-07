import {
  createPlaywrightAdminIdentity,
  createPlaywrightAgentIdentity,
  createPlaywrightImageFileName,
  createPlaywrightRatingComment,
  createPlaywrightVendorIdentity,
} from "../../../lib/testing/playwright-artifacts.ts";

type ArtifactScope = {
  title: string;
  workerIndex?: number;
  retry?: number;
  timestamp?: Date;
};

type CleanupTask = {
  label: string;
  run: () => Promise<void> | void;
};

export function createPlaywrightCleanupRegistry() {
  const tasks: CleanupTask[] = [];

  return {
    register(label: string, run: CleanupTask["run"]) {
      tasks.push({ label, run });
    },
    async runAll() {
      const errors: Array<{ label: string; message: string }> = [];

      for (const task of [...tasks].reverse()) {
        try {
          await task.run();
        } catch (error) {
          errors.push({
            label: task.label,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return {
        errors,
      };
    },
  };
}

export function createPlaywrightArtifactFactory(scope: ArtifactScope) {
  const sharedScope = {
    title: scope.title,
    workerIndex: scope.workerIndex ?? 0,
    retry: scope.retry ?? 0,
    timestamp: scope.timestamp,
  };

  return {
    createVendor(label = "vendor") {
      return createPlaywrightVendorIdentity({
        ...sharedScope,
        title: `${scope.title}-${label}`,
      });
    },
    createAdmin(label = "admin") {
      return createPlaywrightAdminIdentity({
        ...sharedScope,
        title: `${scope.title}-${label}`,
      });
    },
    createAgent(label = "agent") {
      return createPlaywrightAgentIdentity({
        ...sharedScope,
        title: `${scope.title}-${label}`,
      });
    },
    createRating(label = "rating") {
      return {
        comment: createPlaywrightRatingComment({
          ...sharedScope,
          title: `${scope.title}-${label}`,
        }),
      };
    },
    createImage(label = "image", extension?: "jpg" | "jpeg" | "png" | "webp") {
      return {
        fileName: createPlaywrightImageFileName({
          ...sharedScope,
          title: `${scope.title}-${label}`,
          extension,
        }),
      };
    },
  };
}
