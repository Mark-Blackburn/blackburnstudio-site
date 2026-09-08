import type { ClientGallery } from "@/lib/client-galleries/contracts";

export const SAMPLE_CLIENT_GALLERY_ID = "g_7Rk3mN9xQ2vL8pT4";

const sampleClientGallery: ClientGallery = {
  id: SAMPLE_CLIENT_GALLERY_ID,
  title: "Sample Photography Gallery",
  clientDisplayName: "Sample Client",
  message:
    "A private space to revisit your photographs and enjoy the collection at your own pace.",
  expiresAt: "2099-11-30T13:00:00.000Z",
  assets: [
    {
      id: "sample-01",
      altText: "Portrait in warm natural light",
      width: 1637,
      height: 2046,
      orientation: "portrait",
      displayOrder: 0,
      webImageUrl: "/portraits/hero.jpg",
    },
    {
      id: "sample-02",
      altText: "Family walking together beside the water",
      width: 2400,
      height: 1600,
      orientation: "landscape",
      displayOrder: 1,
      webImageUrl: "/families/families-beach-connection.jpg",
    },
    {
      id: "sample-03",
      altText: "Relaxed candid portrait",
      width: 1920,
      height: 2400,
      orientation: "portrait",
      displayOrder: 2,
      webImageUrl: "/portraits/candid.jpg",
    },
    {
      id: "sample-04",
      altText: "Couple photographed beside a waterfall",
      width: 2400,
      height: 1889,
      orientation: "landscape",
      displayOrder: 3,
      webImageUrl: "/couples/couples-waterfall-portrait.jpg",
    },
    {
      id: "sample-05",
      altText: "Natural outdoor portrait",
      width: 1920,
      height: 2400,
      orientation: "portrait",
      displayOrder: 4,
      webImageUrl: "/portraits/natural.jpg",
    },
    {
      id: "sample-06",
      altText: "Family portrait beneath an open sky",
      width: 2400,
      height: 1600,
      orientation: "landscape",
      displayOrder: 5,
      webImageUrl: "/families/families-generational-family.jpg",
    },
    {
      id: "sample-07",
      altText: "Couple sharing a quiet moment with their dog",
      width: 1600,
      height: 2400,
      orientation: "portrait",
      displayOrder: 6,
      webImageUrl: "/couples/couples-with-dog.jpg",
    },
    {
      id: "sample-08",
      altText: "Japanese pagoda framed by surrounding trees",
      width: 2400,
      height: 1600,
      orientation: "landscape",
      displayOrder: 7,
      webImageUrl: "/japan/pagoda.jpg",
    },
    {
      id: "sample-09",
      altText: "Contemplative portrait against a dark background",
      width: 1498,
      height: 1873,
      orientation: "portrait",
      displayOrder: 8,
      webImageUrl: "/portraits/male.jpg",
    },
    {
      id: "sample-10",
      altText: "Garden reflected in still water",
      width: 1600,
      height: 2400,
      orientation: "portrait",
      displayOrder: 9,
      webImageUrl: "/japan/garden-reflection.jpg",
    },
  ],
};

export function getSampleClientGallery(
  galleryId: string,
): ClientGallery | null {
  if (galleryId !== SAMPLE_CLIENT_GALLERY_ID) {
    return null;
  }

  return {
    ...sampleClientGallery,
    assets: [...sampleClientGallery.assets].sort(
      (left, right) => left.displayOrder - right.displayOrder,
    ),
  };
}