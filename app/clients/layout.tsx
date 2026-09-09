import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Private client gallery",
  robots: "noindex, nofollow, noarchive",
  alternates: null,
  openGraph: null,
  twitter: null,
};

export default function ClientsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}