import type { Metadata } from "next";
import { GalleryAdmin } from "@/components/gallery-admin/GalleryAdmin";

export const metadata: Metadata = {
  title: "Gallery administration | Blackburn Studio",
  robots: { index: false, follow: false },
};
export default function GalleryAdminPage() {
  return <GalleryAdmin />;
}
