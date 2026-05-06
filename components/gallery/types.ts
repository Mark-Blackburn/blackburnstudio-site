export type GalleryImage = {
  id: number;
  src: string;
  alt: string;
  blurDataURL: string;
};

export type MorphOrigin = {
  rect: DOMRect;
  borderRadius: string;
};

export type MorphPhase = "opening" | "open" | "closing";

export type Axis = "none" | "x" | "y";
