// Only deliberate, pre-publication rejections use this class. Storage/SDK
// exceptions must keep the generic uncertain-completion response.
export class GalleryUploadValidationError extends Error {}
