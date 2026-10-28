import { expect, it } from "vitest";
import { parseArchiveRange } from "./galleryArchiveDownload";

it("supports full downloads and bounded resume ranges", () => {
  expect(parseArchiveRange(null, 1000)).toBeNull();
  expect(parseArchiveRange("bytes=0-99", 1000)).toEqual({ start: 0, end: 99 });
  expect(parseArchiveRange("bytes=500-", 1000)).toEqual({ start: 500, end: 999 });
  expect(parseArchiveRange("bytes=-100", 1000)).toEqual({ start: 900, end: 999 });
  expect(parseArchiveRange("bytes=900-2000", 1000)).toEqual({ start: 900, end: 999 });
  expect(parseArchiveRange("bytes=-2000", 1000)).toEqual({ start: 0, end: 999 });
});

it("rejects malformed, multiple, empty and unsatisfiable ranges", () => {
  for (const header of [
    "bytes=1000-", "bytes=99-20", "bytes=-0", "bytes=-",
    "bytes=1-2,4-5", "items=0-10", "bytes=foo-bar",
    "bytes=9007199254740993-", "bytes=0-9007199254740993",
  ]) expect(parseArchiveRange(header, 1000)).toBe("invalid");
});
