import { zipSync } from "fflate";

import { uniqueOutputFilenames } from "./imageResizerBatch";

export function createImageZip(
  entries: Array<{ fileName: string; bytes: ArrayBuffer }>,
) {
  const archiveEntries: Record<string, Uint8Array> = {};
  const uniqueNames = uniqueOutputFilenames(
    entries.map((entry) => entry.fileName),
  );

  entries.forEach((entry, index) => {
    archiveEntries[uniqueNames[index]] = new Uint8Array(entry.bytes);
  });

  return zipSync(archiveEntries, { level: 0 });
}