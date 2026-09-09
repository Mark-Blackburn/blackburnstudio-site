import {
  ClientGallery,
  ClientGalleryUnavailable,
} from "@/components/client-gallery";
import { getSampleClientGallery } from "@/lib/client-galleries/fixtures/sampleClientGallery";

export default async function ClientGalleryPage({
  params,
}: {
  params: Promise<{ galleryId: string }>;
}) {
  const { galleryId } = await params;
  const gallery = getSampleClientGallery(galleryId);

  if (!gallery) {
    return <ClientGalleryUnavailable />;
  }

  return <ClientGallery gallery={gallery} />;
}