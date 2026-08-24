import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import {
  defaultOutputFilename,
  normaliseOutputFilename,
  titleFromFilename,
  uniqueOutputFilenames,
} from "@/components/tools/imageResizerBatch";
import { createImageZip } from "@/components/tools/imageResizerZip";

describe("image resizer batch output helpers", () => {
  it("builds established default names with the effective extension", () => {
    expect(
      defaultOutputFilename("My Product.JPG", 1600, "original", "JPEG"),
    ).toBe("my-product-resized-1600px.jpg");
    expect(
      defaultOutputFilename("My Product.JPG", 1000, "WebP", "JPEG"),
    ).toBe("my-product-resized-1000px.webp");
  });

  it("normalises edited names and repairs blank values", () => {
    expect(
      normaliseOutputFilename(
        "../Hero image?.png",
        "JPEG",
        "PNG",
        "source.png",
        1600,
      ),
    ).toBe("hero-image.jpg");
    expect(
      normaliseOutputFilename("", "original", "PNG", "source.png", 1600),
    ).toBe("source-resized-1600px.png");
  });

  it("makes duplicate names unique case-insensitively", () => {
    expect(
      uniqueOutputFilenames(["hero.jpg", "Hero.jpg", "hero.jpg"]),
    ).toEqual(["hero.jpg", "Hero-2.jpg", "hero-3.jpg"]);
  });

  it("derives an editable title from the source filename", () => {
    expect(titleFromFilename("summer_family-session.jpg")).toBe(
      "Summer Family Session",
    );
  });

  it("creates a ZIP containing safe unique successful output names", () => {
    const archive = createImageZip([
      {
        fileName: "hero.jpg",
        bytes: new Uint8Array([1, 2, 3]).buffer,
      },
      {
        fileName: "hero.jpg",
        bytes: new Uint8Array([4, 5]).buffer,
      },
    ]);
    const entries = unzipSync(archive);

    expect(Object.keys(entries)).toEqual(["hero.jpg", "hero-2.jpg"]);
    expect(Array.from(entries["hero.jpg"])).toEqual([1, 2, 3]);
    expect(Array.from(entries["hero-2.jpg"])).toEqual([4, 5]);
  });
});
