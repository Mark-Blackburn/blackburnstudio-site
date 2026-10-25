/**
 * Streaming, STORE-only ZIP64 encoder for already-compressed JPEGs.
 * The caller owns the private source streams and destination upload.
 * No photograph or completed archive is accumulated in memory.
 */
import { archiveEntryName, type ArchiveVariant } from "./galleryArchiveSelection";

export interface ZipSource {
  photoNumber: number;
  variant: ArchiveVariant;
  bytes: number;
  chunks: AsyncIterable<Uint8Array>;
}

const U16 = 0xffff;
const U32 = 0xffffffff;
const encoder = new TextEncoder();

function u16(value: number): Buffer {
  const b = Buffer.alloc(2); b.writeUInt16LE(value); return b;
}
function u32(value: number): Buffer {
  const b = Buffer.alloc(4); b.writeUInt32LE(value >>> 0); return b;
}
function u64(value: bigint): Buffer {
  if (value < 0n || value > 0xffffffffffffffffn) throw new Error("ZIP64 value out of range");
  const b = Buffer.alloc(8); b.writeBigUInt64LE(value); return b;
}
function crcUpdate(crc: number, data: Uint8Array): number {
  let current = crc;
  for (const byte of data) {
    current ^= byte;
    for (let bit = 0; bit < 8; bit++)
      current = (current >>> 1) ^ ((current & 1) ? 0xedb88320 : 0);
  }
  return current >>> 0;
}
function centralEntry(name: Buffer, crc: number, size: bigint, offset: bigint): Buffer {
  const extra = Buffer.concat([u16(0x0001), u16(24), u64(size), u64(size), u64(offset)]);
  return Buffer.concat([
    u32(0x02014b50), u16(45), u16(45), u16(0x0008), u16(0), u16(0), u16(0),
    u32(crc), u32(U32), u32(U32), u16(name.length), u16(extra.length),
    u16(0), u16(0), u16(0), u32(0), u32(U32), name, extra,
  ]);
}

export async function* streamGalleryZip64(
  sources: AsyncIterable<ZipSource>,
  signal?: AbortSignal,
): AsyncGenerator<Buffer> {
  const directory: Buffer[] = [];
  const names = new Set<string>();
  let offset = 0n;
  let entries = 0;
  const emit = (chunk: Buffer): Buffer => { offset += BigInt(chunk.length); return chunk; };
  for await (const source of sources) {
    signal?.throwIfAborted();
    const filename = archiveEntryName(source.photoNumber, source.variant);
    if (names.has(filename)) throw new Error("Duplicate archive entry");
    names.add(filename);
    if (!Number.isSafeInteger(source.bytes) || source.bytes < 3 || source.bytes > 25 * 1024 * 1024)
      throw new Error("Invalid archive source size");
    const name = Buffer.from(encoder.encode(filename));
    const start = offset;
    // Bit 3: CRC and sizes follow the file in a data descriptor.
    // ZIP64 extra reserves both 64-bit sizes in the local header.
    const extra = Buffer.concat([u16(0x0001), u16(16), u64(0n), u64(0n)]);
    yield emit(Buffer.concat([
      u32(0x04034b50), u16(45), u16(0x0008), u16(0), u16(0), u16(0),
      u32(0), u32(U32), u32(U32), u16(name.length), u16(extra.length), name, extra,
    ]));
    let count = 0;
    let crc = U32;
    for await (const chunk of source.chunks) {
      signal?.throwIfAborted();
      if (!chunk.byteLength) continue;
      count += chunk.byteLength;
      if (count > source.bytes) throw new Error("Archive source exceeds declared size");
      crc = crcUpdate(crc, chunk);
      yield emit(Buffer.from(chunk));
    }
    if (count !== source.bytes) throw new Error("Archive source size mismatch");
    crc = (crc ^ U32) >>> 0;
    const size = BigInt(count);
    yield emit(Buffer.concat([u32(0x08074b50), u32(crc), u64(size), u64(size)]));
    directory.push(centralEntry(name, crc, size, start));
    entries++;
    if (entries > 300) throw new Error("Archive contains too many entries");
  }
  if (!entries) throw new Error("Archive selection is empty");
  const directoryOffset = offset;
  for (const entry of directory) yield emit(entry);
  const directorySize = offset - directoryOffset;
  const zip64EndOffset = offset;
  yield emit(Buffer.concat([
    u32(0x06064b50), u64(44n), u16(45), u16(45), u32(0), u32(0),
    u64(BigInt(entries)), u64(BigInt(entries)), u64(directorySize), u64(directoryOffset),
  ]));
  yield emit(Buffer.concat([
    u32(0x07064b50), u32(0), u64(zip64EndOffset), u32(1),
  ]));
  yield emit(Buffer.concat([
    u32(0x06054b50), u16(0), u16(0),
    u16(Math.min(entries, U16)), u16(Math.min(entries, U16)),
    u32(U32), u32(U32), u16(0),
  ]));
}
