import { createHash, randomUUID } from "node:crypto";
import * as nodeFileSystem from "node:fs/promises";
import { basename, dirname, join } from "node:path";

export const PDF_REDUCER_ARTIFACTS = Object.freeze([
  "pdf-reducer-worker.mjs",
  "pdf-reducer.mjs",
  "pdf-reducer.wasm",
  "THIRD_PARTY_NOTICES.md",
]);

const MANIFEST_NAME = "runtime-manifest.json";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function manifestText(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

async function pathExists(path, fileSystem) {
  try {
    await fileSystem.stat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

export async function verifyPdfReducerDistribution(
  directory,
  manifest,
  fileSystem = nodeFileSystem,
) {
  const expectedFiles = [...PDF_REDUCER_ARTIFACTS, MANIFEST_NAME].sort();
  const actualFiles = (await fileSystem.readdir(directory)).sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error(`Unexpected PDF Reducer distribution files: ${actualFiles.join(", ")}`);
  }

  const stagedManifest = await fileSystem.readFile(join(directory, MANIFEST_NAME));
  if (stagedManifest.toString("utf8") !== manifestText(manifest)) {
    throw new Error("Staged PDF Reducer manifest is not deterministic");
  }
  for (const name of PDF_REDUCER_ARTIFACTS) {
    const expected = manifest.artifacts[name];
    if (!expected) throw new Error(`Missing PDF Reducer manifest entry: ${name}`);
    const bytes = await fileSystem.readFile(join(directory, name));
    if (bytes.byteLength !== expected.bytes || sha256(bytes) !== expected.sha256) {
      throw new Error(`Staged PDF Reducer artifact mismatch: ${name}`);
    }
  }
}

export async function publishPdfReducerDistribution({
  sourceDirectory,
  publicDirectory,
  manifest,
  fileSystem = nodeFileSystem,
}) {
  const parentDirectory = dirname(publicDirectory);
  const versionName = basename(publicDirectory);
  await fileSystem.mkdir(parentDirectory, { recursive: true });
  const stagingDirectory = await fileSystem.mkdtemp(
    join(parentDirectory, `${versionName}.staging-`),
  );
  const backupDirectory = join(
    parentDirectory,
    `${versionName}.backup-${randomUUID()}`,
  );
  let existingMoved = false;

  try {
    for (const name of PDF_REDUCER_ARTIFACTS) {
      await fileSystem.copyFile(
        join(sourceDirectory, name),
        join(stagingDirectory, name),
      );
    }
    await fileSystem.writeFile(
      join(stagingDirectory, MANIFEST_NAME),
      manifestText(manifest),
    );
    await verifyPdfReducerDistribution(stagingDirectory, manifest, fileSystem);

    if (await pathExists(publicDirectory, fileSystem)) {
      await fileSystem.rename(publicDirectory, backupDirectory);
      existingMoved = true;
    }

    try {
      await fileSystem.rename(stagingDirectory, publicDirectory);
    } catch (activationError) {
      if (existingMoved) {
        try {
          await fileSystem.rename(backupDirectory, publicDirectory);
          existingMoved = false;
        } catch (restoreError) {
          throw new AggregateError(
            [activationError, restoreError],
            "PDF Reducer publication failed and the previous runtime could not be restored",
          );
        }
      }
      throw activationError;
    }

    try {
      await verifyPdfReducerDistribution(publicDirectory, manifest, fileSystem);
    } catch (verificationError) {
      try {
        await fileSystem.rename(publicDirectory, stagingDirectory);
        if (existingMoved) {
          await fileSystem.rename(backupDirectory, publicDirectory);
          existingMoved = false;
        }
      } catch (restoreError) {
        throw new AggregateError(
          [verificationError, restoreError],
          "PDF Reducer publication verification failed and the previous runtime could not be restored",
        );
      }
      throw verificationError;
    }

    if (existingMoved) {
      await fileSystem.rm(backupDirectory, { recursive: true, force: true });
      existingMoved = false;
    }
  } finally {
    await fileSystem.rm(stagingDirectory, { recursive: true, force: true });
  }
}
