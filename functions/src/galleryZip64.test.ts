import { expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { streamGalleryZip64, type ZipSource } from "./galleryZip64";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0xff, 0xd9]);
async function* source(parts: Uint8Array[], number = 1): AsyncGenerator<ZipSource> {
  yield {
    photoNumber: number, variant: "full", bytes: parts.reduce((n, p) => n + p.length, 0),
    chunks: (async function* () { for (const part of parts) yield part; })(),
  };
}
async function collect(input: AsyncIterable<Buffer>) {
  const buffers: Buffer[] = [];
  for await (const chunk of input) buffers.push(chunk);
  return Buffer.concat(buffers);
}

it("emits ZIP64 headers, original filename, stored bytes and end records", async () => {
  const zip = await collect(streamGalleryZip64(source([jpeg.subarray(0, 3), jpeg.subarray(3)])));
  expect(zip.readUInt32LE(0)).toBe(0x04034b50);
  expect(zip.readUInt16LE(4)).toBe(45);
  expect(zip.readUInt16LE(6)).toBe(8);
  expect(zip.readUInt16LE(8)).toBe(0); // STORE: JPEGs are not recompressed
  expect(zip.includes(Buffer.from("photo-001-full.jpg"))).toBe(true);
  expect(zip.includes(jpeg)).toBe(true);
  const central = zip.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  expect(central).toBeGreaterThan(0);
  expect(zip.readUInt32LE(central + 24)).toBe(0xffffffff);
  expect(zip.readUInt32LE(central + 42)).toBe(0xffffffff);
  expect(zip.includes(Buffer.from([0x50, 0x4b, 0x06, 0x06]))).toBe(true);
  expect(zip.includes(Buffer.from([0x50, 0x4b, 0x06, 0x07]))).toBe(true);
  expect(zip.readUInt32LE(zip.length - 22)).toBe(0x06054b50);
});

it("streams multiple numbered entries in requested order", async () => {
  async function* sources(): AsyncGenerator<ZipSource> {
    yield* source([jpeg], 13);
    yield* source([jpeg], 3);
  }
  const zip = await collect(streamGalleryZip64(sources()));
  const first = zip.indexOf(Buffer.from("photo-013-full.jpg"));
  const second = zip.indexOf(Buffer.from("photo-003-full.jpg"));
  expect(first).toBeGreaterThan(0);
  expect(second).toBeGreaterThan(first);
});

it("rejects truncation, overflow, duplicates and cancellation", async () => {
  async function* wrong(bytes: number): AsyncGenerator<ZipSource> {
    yield { photoNumber: 1, variant: "web", bytes, chunks: (async function* () { yield jpeg; })() };
  }
  await expect(collect(streamGalleryZip64(wrong(7)))).rejects.toThrow("size mismatch");
  await expect(collect(streamGalleryZip64(wrong(3)))).rejects.toThrow("exceeds declared");
  async function* duplicate(): AsyncGenerator<ZipSource> {
    yield* source([jpeg]);
    yield* source([jpeg]);
  }
  await expect(collect(streamGalleryZip64(duplicate()))).rejects.toThrow("Duplicate");
  const controller = new AbortController();
  controller.abort();
  await expect(collect(streamGalleryZip64(source([jpeg]), controller.signal))).rejects.toThrow();
});

it("does not accept an empty selection", async () => {
  async function* empty(): AsyncGenerator<ZipSource> {}
  await expect(collect(streamGalleryZip64(empty()))).rejects.toThrow("empty");
});

it("is independently readable by Python zipfile with intact JPEG bytes and numbered entries", async () => {
  async function* entries(): AsyncGenerator<ZipSource> {
    yield* source([jpeg.subarray(0, 2), jpeg.subarray(2)], 13);
    yield* source([jpeg], 3);
  }
  const archive = await collect(streamGalleryZip64(entries()));
  // The external reader verifies ZIP64 directory/offsets, descriptors, CRC32,
  // file ordering and extraction; structural signature tests cannot do this.
  const script = [
    "import io, json, sys, zipfile",
    "data = sys.stdin.buffer.read()",
    "with zipfile.ZipFile(io.BytesIO(data), 'r') as z:",
    "    names = z.namelist()",
    "    assert names == ['photo-013-full.jpg', 'photo-003-full.jpg'], names",
    "    for name in names:",
    "        assert z.getinfo(name).compress_type == zipfile.ZIP_STORED",
    "        assert z.read(name) == bytes([255, 216, 255, 0, 255, 217])",
    "print('validated')",
  ].join("\n");
  const result = spawnSync("python3", ["-c", script], {
    input: archive, encoding: "utf8", timeout: 10000,
  });
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout.trim()).toBe("validated");
});
