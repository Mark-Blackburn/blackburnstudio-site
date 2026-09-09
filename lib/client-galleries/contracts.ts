export type GalleryStatus =
  | "draft"
  | "published"
  | "unpublished"
  | "revoked";

export type GalleryOrientation = "portrait" | "landscape" | "square";

export type Gallery = {
  id: string;
  clientDisplayName: string;
  clientEmail: string;
  title: string;
  message?: string;
  status: GalleryStatus;
  createdAt: string;
  publishedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  accessTokenHash?: string;
  accessTokenVersion: number;
  sessionVersion: number;
};

export type GalleryAsset = {
  galleryId: string;
  id: string;
  filename: string;
  normalizedFilename: string;
  displayOrder: number;
  altText: string;
  width: number;
  height: number;
  orientation: GalleryOrientation;
  webBlobPath: string;
  fullBlobPath: string;
  contentType: string;
  webByteSize?: number;
  fullByteSize?: number;
};

export type ClientGalleryAsset = {
  id: string;
  altText: string;
  width: number;
  height: number;
  orientation: GalleryOrientation;
  displayOrder: number;
  webImageUrl: string;
};

export type ClientGallery = {
  id: string;
  title: string;
  clientDisplayName?: string;
  message?: string;
  expiresAt?: string;
  assets: ClientGalleryAsset[];
};