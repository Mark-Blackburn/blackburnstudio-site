import type { ImageResizerOutputFormat } from "./imageResizerWorkerProtocol";

export type ConcreteImageFormat = "JPEG" | "PNG" | "WebP";

const EXTENSIONS: Record<ConcreteImageFormat, string> = {
  JPEG: ".jpg",
  PNG: ".png",
  WebP: ".webp",
};

function filenameStem(value: string) {
  const filename = value.split(/[\\/]/).at(-1) ?? "";
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(0, dot) : filename;
}

function webFilenameStem(value: string) {
  return (
    filenameStem(value)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "image"
  );
}

export function effectiveOutputFormat(
  outputFormat: ImageResizerOutputFormat,
  sourceFormat: ConcreteImageFormat,
) {
  return outputFormat === "original" ? sourceFormat : outputFormat;
}

export function defaultOutputFilename(
  sourceFilename: string,
  longEdge: number,
  outputFormat: ImageResizerOutputFormat,
  sourceFormat: ConcreteImageFormat,
) {
  const format = effectiveOutputFormat(outputFormat, sourceFormat);
  return `${webFilenameStem(sourceFilename)}-resized-${longEdge}px${EXTENSIONS[format]}`;
}

export function normaliseOutputFilename(
  value: string,
  outputFormat: ImageResizerOutputFormat,
  sourceFormat: ConcreteImageFormat,
  fallbackSourceFilename: string,
  longEdge: number,
) {
  if (!value.trim()) {
    return defaultOutputFilename(
      fallbackSourceFilename,
      longEdge,
      outputFormat,
      sourceFormat,
    );
  }

  const format = effectiveOutputFormat(outputFormat, sourceFormat);
  const stem = webFilenameStem(value || fallbackSourceFilename);
  return `${stem}${EXTENSIONS[format]}`;
}

export function uniqueOutputFilenames(fileNames: string[]) {
  const used = new Set<string>();

  return fileNames.map((fileName) => {
    const dot = fileName.lastIndexOf(".");
    const stem = dot > 0 ? fileName.slice(0, dot) : fileName;
    const extension = dot > 0 ? fileName.slice(dot) : "";
    let candidate = fileName;
    let suffix = 2;

    while (used.has(candidate.toLowerCase())) {
      candidate = `${stem}-${suffix}${extension}`;
      suffix += 1;
    }

    used.add(candidate.toLowerCase());
    return candidate;
  });
}

export function titleFromFilename(fileName: string) {
  return filenameStem(fileName)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

