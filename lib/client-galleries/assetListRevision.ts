// Asset IDs are immutable and cannot contain commas. The exact ordered ID list
// identifies the displayed numbering without revealing storage paths or secrets.
export function galleryAssetListRevision(assets: ReadonlyArray<{ id: string }>): string {
  return assets.map(asset => asset.id).join(",");
}
