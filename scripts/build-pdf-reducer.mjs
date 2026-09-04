import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  PDF_REDUCER_ARTIFACTS,
  publishPdfReducerDistribution,
} from "./pdf-reducer-publication.mjs";

const root = resolve(import.meta.dirname, "..");
const dockerfile = join(root, "runtime/pdf-reducer/build/Dockerfile");
const publicDirectory = join(root, "public/runtime/pdf-reducer/1.0.0");
const temporaryRoot = await mkdtemp(join(tmpdir(), "blackburn-pdf-reducer-"));
const first = join(temporaryRoot, "first");
const second = join(temporaryRoot, "second");
const artifacts = PDF_REDUCER_ARTIFACTS;

function build(destination, token) {
  try {
    execFileSync(
      "docker",
      [
        "build",
        "--progress",
        "plain",
        "--platform",
        "linux/amd64",
        "--file",
        dockerfile,
        "--build-arg",
        `BUILD_VARIANT=${token}`,
        "--output",
        `type=local,dest=${destination}`,
        root,
      ],
      { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 4 * 1024 * 1024 },
    );
  } catch (error) {
    if (error.stdout) process.stderr.write(error.stdout);
    if (error.stderr) process.stderr.write(error.stderr);
    throw error;
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

try {
  await mkdir(first);
  await mkdir(second);
  build(first, "clean-build-one");
  build(second, "clean-build-two");

  const manifestArtifacts = {};
  for (const name of artifacts) {
    const [firstBytes, secondBytes] = await Promise.all([
      readFile(join(first, name)),
      readFile(join(second, name)),
    ]);
    const firstHash = sha256(firstBytes);
    const secondHash = sha256(secondBytes);
    if (firstHash !== secondHash) {
      throw new Error(`${name} is not reproducible: ${firstHash} != ${secondHash}`);
    }
    manifestArtifacts[name] = { sha256: firstHash, bytes: firstBytes.byteLength };
  }

  const manifest = {
    runtimeVersion: "1.0.0",
    qpdfVersion: "12.4.1",
    emscriptenVersion: "4.0.17",
    artifacts: manifestArtifacts,
    supportedModes: ["optimize", "reduce-images"],
  };

  await publishPdfReducerDistribution({
    sourceDirectory: first,
    publicDirectory,
    manifest,
  });
  console.log("PDF Reducer runtime built twice with byte-identical artifacts.");
  console.log(JSON.stringify(manifest, null, 2));
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
