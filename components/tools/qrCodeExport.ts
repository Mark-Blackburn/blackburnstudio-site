const SVG_MIME = "image/svg+xml;charset=utf-8";

export function serializeQrSvg(svg: SVGSVGElement, size: number) {
  const exportSvg = svg.cloneNode(true) as SVGSVGElement;
  exportSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  exportSvg.setAttribute("width", String(size));
  exportSvg.setAttribute("height", String(size));

  return new XMLSerializer().serializeToString(exportSvg);
}

export function createSvgBlob(svg: SVGSVGElement, size: number) {
  return new Blob([serializeQrSvg(svg, size)], { type: SVG_MIME });
}

export function createPngBlob(svg: SVGSVGElement, size: number) {
  return new Promise<Blob>((resolve, reject) => {
    let sourceUrl: string | null = null;

    const revokeSourceUrl = () => {
      if (!sourceUrl) return;
      URL.revokeObjectURL(sourceUrl);
      sourceUrl = null;
    };

    try {
      const sourceBlob = createSvgBlob(svg, size);
      sourceUrl = URL.createObjectURL(sourceBlob);
      const image = new Image();

      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("PNG canvas context is unavailable.");
          }

          context.drawImage(image, 0, 0, size, size);
          revokeSourceUrl();
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("PNG rendering returned no data."));
          }, "image/png");
        } catch (error) {
          revokeSourceUrl();
          reject(error);
        }
      };

      image.onerror = () => {
        revokeSourceUrl();
        reject(new Error("SVG source could not be loaded for PNG rendering."));
      };

      image.src = sourceUrl;
    } catch (error) {
      revokeSourceUrl();
      reject(error);
    }
  });
}
