// Shared by gallery uploads, storage readers and browser downloads.
export const MAX_GALLERY_ASSETS = 300;
export const MAX_WEB_BYTES = 4 * 1024 * 1024;
export const MAX_FULL_BYTES = 25 * 1024 * 1024;
// One full JPEG, one web JPEG, plus bounded multipart overhead.
export const MAX_ADMIN_UPLOAD_BYTES = MAX_FULL_BYTES + MAX_WEB_BYTES + 1024 * 1024;
