import { describe, expect, it } from "vitest";

import {
  isCreateZipWorkerRequest,
  isImageResizerCropRect,
  isImageResizerWorkerResponse,
  isPredictCropWorkerRequest,
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
  outputFilename: "portrait-resized-1600px.jpg",
  title: "Portrait",
  altText: "A portrait in natural light",
  creator: "Blackburn Studio",
  copyright: "Copyright Blackburn Studio",
  stripMetadata: true,
};

describe("isProcessImageWorkerRequest", () => {
  it("accepts a valid process-image request", () => {
    expect(isProcessImageWorkerRequest(validProcessImageRequest)).toBe(true);
  });

  it("accepts a valid normalized crop and accepts an omitted crop", () => {
    expect(
      isProcessImageWorkerRequest({
        ...validProcessImageRequest,
        crop: { x: 0.1, y: 0.2, width: 0.5, height: 0.6 },
      }),
    ).toBe(true);
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
    ["outputFilename", { outputFilename: undefined }],
    ["title", { title: undefined }],
    ["altText", { altText: undefined }],
    ["creator", { creator: undefined }],
    ["copyright", { copyright: undefined }],
    ["stripMetadata", { stripMetadata: undefined }],
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

  it("rejects invalid metadata and output fields", () => {
    expect(
      isProcessImageWorkerRequest({
        ...validProcessImageRequest,
        outputFilename: "",
      }),
    ).toBe(false);
    expect(
      isProcessImageWorkerRequest({
        ...validProcessImageRequest,
        title: 42,
      }),
    ).toBe(false);
    expect(
      isProcessImageWorkerRequest({
        ...validProcessImageRequest,
        stripMetadata: "true",
      }),
    ).toBe(false);
  });
});

describe("isCreateZipWorkerRequest", () => {
  const validRequest = {
    type: "create-zip",
    requestId: "zip-1",
    entries: [
      {
        fileName: "portrait.jpg",
        bytes: new Uint8Array([1, 2, 3]).buffer,
      },
    ],
  };

  it("accepts a valid ZIP request", () => {
    expect(isCreateZipWorkerRequest(validRequest)).toBe(true);
  });

  it.each([
    { ...validRequest, requestId: "" },
    { ...validRequest, entries: [] },
    { ...validRequest, entries: [{ fileName: "", bytes: new ArrayBuffer(1) }] },
    {
      ...validRequest,
      entries: [{ fileName: "../image.jpg", bytes: new ArrayBuffer(1) }],
    },
    { ...validRequest, entries: [{ fileName: "image.jpg", bytes: "bytes" }] },
    {
      ...validRequest,
      entries: [{ fileName: "image.jpg", bytes: new ArrayBuffer(0) }],
    },
  ])("rejects a malformed ZIP request: %j", (request) => {
    expect(isCreateZipWorkerRequest(request)).toBe(false);
  });
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

describe("isImageResizerCropRect", () => {
  it("accepts a valid crop", () => {
    expect(
      isImageResizerCropRect({ x: 0, y: 0.25, width: 1, height: 0.5 }),
    ).toBe(true);
  });

  it.each([
    { x: -0.1, y: 0, width: 0.5, height: 0.5 },
    { x: 0, y: -0.1, width: 0.5, height: 0.5 },
    { x: 0, y: 0, width: 0, height: 0.5 },
    { x: 0, y: 0, width: 0.5, height: 0 },
    { x: 0.6, y: 0, width: 0.5, height: 1 },
    { x: 0, y: 0.6, width: 1, height: 0.5 },
    { x: Number.NaN, y: 0, width: 1, height: 1 },
    { x: 0, y: 0, width: Number.POSITIVE_INFINITY, height: 1 },
    { x: 0, y: 0, width: 1 },
    { x: 0, y: 0, width: 1, height: 1, left: 0 },
    null,
    [],
  ])("rejects malformed crop %#", (crop) => {
    expect(isImageResizerCropRect(crop)).toBe(false);
    expect(
      isProcessImageWorkerRequest({ ...validProcessImageRequest, crop }),
    ).toBe(false);
  });
});

describe("isPredictCropWorkerRequest", () => {
  const validRequest = {
    type: "predict-crop",
    requestId: "predict-1",
    imageId: "image-1",
    sourceWidth: 2400,
    sourceHeight: 1600,
    longEdge: 1600,
    neverEnlarge: true,
    crop: { x: 1 / 6, y: 0, width: 2 / 3, height: 1 },
  };

  it("accepts a valid crop prediction request", () => {
    expect(isPredictCropWorkerRequest(validRequest)).toBe(true);
  });

  it.each([
    { sourceWidth: 0 },
    { sourceHeight: Number.NaN },
    { longEdge: 1.5 },
    { neverEnlarge: "true" },
    { crop: { x: 0.8, y: 0, width: 0.5, height: 1 } },
  ])("rejects malformed prediction fields: %j", (override) => {
    expect(isPredictCropWorkerRequest({ ...validRequest, ...override })).toBe(
      false,
    );
  });
});