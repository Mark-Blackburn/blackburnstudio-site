// @vitest-environment node

import { createHash } from "node:crypto";
import * as fileSystem from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  PDF_REDUCER_ARTIFACTS,
  publishPdfReducerDistribution,
  verifyPdfReducerDistribution,
} from "../../../scripts/pdf-reducer-publication.mjs";

const temporaryDirectories: string[] = [];

function sha256(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function setupPublication() {
  const root = await fileSystem.mkdtemp(join(tmpdir(), "pdf-reducer-publication-test-"));
  temporaryDirectories.push(root);
  const sourceDirectory = join(root, "source");
  const publicDirectory = join(root, "public", "runtime", "pdf-reducer", "1.0.0");
  await fileSystem.mkdir(sourceDirectory, { recursive: true });
  const artifacts: Record<string, { sha256: string; bytes: number }> = {};
  for (const name of PDF_REDUCER_ARTIFACTS) {
    const bytes = Buffer.from(`new-${name}`);
    await fileSystem.writeFile(join(sourceDirectory, name), bytes);
    artifacts[name] = { sha256: sha256(bytes), bytes: bytes.byteLength };
  }
  const manifest = {
    runtimeVersion: "1.0.0",
    qpdfVersion: "12.4.1",
    emscriptenVersion: "4.0.17",
    artifacts,
    supportedModes: ["optimize", "reduce-images"],
  };
  return { root, sourceDirectory, publicDirectory, manifest };
}

async function writeExistingRuntime(publicDirectory: string) {
  await fileSystem.mkdir(publicDirectory, { recursive: true });
  await fileSystem.writeFile(join(publicDirectory, "known-good.txt"), "old-runtime");
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      fileSystem.rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("PDF Reducer runtime publication", () => {
  it("completes and verifies staging before moving the existing runtime", async () => {
    const context = await setupPublication();
    await writeExistingRuntime(context.publicDirectory);
    let sawCompleteStaging = false;
    const checkedFileSystem = {
      ...fileSystem,
      async rename(...args: Parameters<typeof fileSystem.rename>) {
        const [from, to] = args;
        if (String(from) === context.publicDirectory) {
          expect(await fileSystem.readFile(join(String(from), "known-good.txt"), "utf8")).toBe(
            "old-runtime",
          );
          const siblings = await fileSystem.readdir(join(context.root, "public", "runtime", "pdf-reducer"));
          const staging = siblings.find((name) => name.startsWith("1.0.0.staging-"));
          expect(staging).toBeDefined();
          await verifyPdfReducerDistribution(
            join(context.root, "public", "runtime", "pdf-reducer", staging!),
            context.manifest,
          );
          sawCompleteStaging = true;
        }
        return fileSystem.rename(from, to);
      },
    };

    await publishPdfReducerDistribution({ ...context, fileSystem: checkedFileSystem });
    expect(sawCompleteStaging).toBe(true);
  });

  it("leaves the known-good runtime intact when staging verification fails", async () => {
    const context = await setupPublication();
    await writeExistingRuntime(context.publicDirectory);
    await fileSystem.writeFile(
      join(context.sourceDirectory, PDF_REDUCER_ARTIFACTS[0]),
      "corrupt-artifact",
    );

    await expect(publishPdfReducerDistribution(context)).rejects.toThrow(
      /artifact mismatch/,
    );
    await expect(
      fileSystem.readFile(join(context.publicDirectory, "known-good.txt"), "utf8"),
    ).resolves.toBe("old-runtime");
  });

  it("restores the known-good runtime when activation fails", async () => {
    const context = await setupPublication();
    await writeExistingRuntime(context.publicDirectory);
    let failedActivation = false;
    const failingFileSystem = {
      ...fileSystem,
      async rename(...args: Parameters<typeof fileSystem.rename>) {
        const [from, to] = args;
        if (
          !failedActivation &&
          String(to) === context.publicDirectory &&
          basename(String(from)).startsWith("1.0.0.staging-")
        ) {
          failedActivation = true;
          throw Object.assign(new Error("simulated activation failure"), {
            code: "EACCES",
          });
        }
        return fileSystem.rename(from, to);
      },
    };

    await expect(
      publishPdfReducerDistribution({ ...context, fileSystem: failingFileSystem }),
    ).rejects.toThrow("simulated activation failure");
    await expect(
      fileSystem.readFile(join(context.publicDirectory, "known-good.txt"), "utf8"),
    ).resolves.toBe("old-runtime");
  });

  it("publishes exactly the complete distribution without stale files", async () => {
    const context = await setupPublication();
    await writeExistingRuntime(context.publicDirectory);

    await publishPdfReducerDistribution(context);
    await verifyPdfReducerDistribution(context.publicDirectory, context.manifest);
    expect((await fileSystem.readdir(context.publicDirectory)).sort()).toEqual(
      [...PDF_REDUCER_ARTIFACTS, "runtime-manifest.json"].sort(),
    );
  });
});
