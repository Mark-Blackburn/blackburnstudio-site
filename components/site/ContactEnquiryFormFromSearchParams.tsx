"use client";

import { useSearchParams } from "next/navigation";

import ContactEnquiryForm from "@/components/site/ContactEnquiryForm";

export default function ContactEnquiryFormFromSearchParams() {
  const searchParams = useSearchParams();
  const initialServices = searchParams.getAll("service");

  return <ContactEnquiryForm initialServices={initialServices} />;
}
