import { describe, expect, it } from "vitest";

import {
  isImageResizerWorkerResponse,
  isProcessImageWorkerRequest,
} from "@/components/tools/imageResizerWorkerProtocol";

const validProcessImageRequest = {
  type: "process-image",
  requestId: "process-1",
  imageId: "image-1",
  longEdge: 1600,
  neverEnlarge: true,
  outputFormat: "JPEG",
  quality: 85,
};

describe("isProcessImageWorkerRequest", () => {
  it("accepts a valid process-image request", () => {
    expect(isProcessImageWorkerRequest(validProcessImageRequest)).toBe(true);
  });

  it.each([
    ["type", { type: undefined }],
    ["requestId", { requestId: undefined }],
    ["imageId", { imageId: undefined }],
    ["longEdge", { longEdge: undefined }],
    ["neverEnlarge", { neverEnlarge: undefined }],
    ["outputFormat", { outputFormat: undefined }],
    ["quality", { quality: undefined }],
  ])("rejects a request missing %s", (_field, override) => {
    expect(
      isProcessImageWorkerRequest({
        ...validProcessImageRequest,
        ...override,
      }),
    ).toBe(false);
  });

  it.each(["", "   "])("rejects empty imageId %j", (imageId) => {
    expect(
      isProcessImageWorkerRequest({
        ...validProcessImageRequest,
        imageId,
      }),
    ).toBe(false);
  });

  it.each([
    0,
    -1,
    10.5,
    Number.MAX_SAFE_INTEGER + 1,
    Number.POSITIVE_INFINITY,
    Number.NaN,
  ])(
    "rejects invalid longEdge %s",
    (longEdge) => {
      expect(
        isProcessImageWorkerRequest({
          ...validProcessImageRequest,
          longEdge,
        }),
      ).toBe(false);
    },
  );

  it("rejects an invalid neverEnlarge value", () => {
    expect(
      isProcessImageWorkerRequest({
        ...validProcessImageRequest,
        neverEnlarge: "true",
      }),
    ).toBe(false);
  });

  it("rejects an unsupported outputFormat", () => {
    expect(
      isProcessImageWorkerRequest({
        ...validProcessImageRequest,
        outputFormat: "TIFF",
      }),
    ).toBe(false);
  });

  it.each([0, 101, 85.5, Number.POSITIVE_INFINITY, Number.NaN])(
    "rejects invalid quality %s",
    (quality) => {
      expect(
        isProcessImageWorkerRequest({
          ...validProcessImageRequest,
          quality,
        }),
      ).toBe(false);
    },
  );
});

describe("isImageResizerWorkerResponse", () => {
  it("accepts a documented worker response envelope", () => {
    expect(
      isImageResizerWorkerResponse({
        type: "ready",
        requestId: "initialize-1",
      }),
    ).toBe(true);
  });

  it.each([
    null,
    {},
    { type: "unknown", requestId: "request-1" },
    { type: "ready" },
    { type: "ready", requestId: 1 },
  ])("rejects an unknown or malformed response: %j", (value) => {
    expect(isImageResizerWorkerResponse(value)).toBe(false);
  });
});