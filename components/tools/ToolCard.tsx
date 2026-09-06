import Image, { type StaticImageData } from "next/image";
import Link from "next/link";

import { StudioButton, StudioTag } from "@/components/studio";

type ToolCardBaseProps = {
  title: string;
  summary: string;
  href: string;
  ctaLabel: string;
  features: string[];
  platform: string;
  availability: string;
  variant?: "dark" | "light";
};

type ToolCardImageProps =
  | {
      imageSrc: StaticImageData;
      imageAlt: string;
    }
  | {
      imageSrc?: undefined;
      imageAlt?: undefined;
    };

type ToolCardProps = ToolCardBaseProps & ToolCardImageProps;

export default function ToolCard({
  title,
  summary,
  href,
  ctaLabel,
  features,
  platform,
  availability,
  imageSrc,
  imageAlt,
  variant = "dark",
}: ToolCardProps) {
  const light = variant === "light";

  return (
    <article
      className={
        light
          ? "flex h-full flex-col rounded-2xl border border-studio-border bg-studio-surface p-6 shadow-[0_18px_50px_rgba(17,17,17,0.05)] md:p-7"
          : "flex h-full flex-col rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-6 md:p-7"
      }
    >
      {imageSrc ? (
        <Link
          href={href}
          className={`block max-w-xl rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-offset-4 ${
            light
              ? "focus-visible:ring-black/60 focus-visible:ring-offset-studio-surface"
              : "focus-visible:ring-white/70 focus-visible:ring-offset-studio-base"
          }`}
        >
          <Image
            src={imageSrc}
            alt={imageAlt}
            sizes="(min-width: 768px) 36rem, calc(100vw - 6rem)"
            className={`h-auto w-full rounded-xl border ${
              light
                ? "border-black/25 shadow-[0_1px_2px_rgba(17,17,17,0.1),0_8px_20px_rgba(17,17,17,0.13)]"
                : "border-studio-border/70"
            }`}
          />
        </Link>
      ) : null}
      <div className={`flex flex-wrap gap-2.5${imageSrc ? " mt-6" : ""}`}>
        <StudioTag className={light ? "bg-studio-base/70 text-studio-muted" : undefined}>
          {platform}
        </StudioTag>
        <StudioTag className={light ? "bg-studio-base/70 text-studio-muted" : undefined}>
          {availability}
        </StudioTag>
      </div>
      <h2 className="mt-5 text-2xl font-medium tracking-tight text-studio-text md:text-3xl">
        {title}
      </h2>
      <p className="mt-4 max-w-[62ch] text-sm leading-relaxed text-studio-muted md:text-base">
        {summary}
      </p>
      <ul
        className="mt-6 grid gap-2.5 text-sm leading-relaxed text-studio-muted sm:grid-cols-2"
        aria-label={`${title} features`}
      >
        {features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <span
              className={`mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full ${
                light ? "bg-[#b9955a]" : "bg-studio-border"
              }`}
              aria-hidden="true"
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex-1" />
      <div className={`border-t pt-6 ${light ? "border-black/10" : "border-studio-border/60"}`}>
        <StudioButton
          href={href}
          variant="secondary"
          className={
            light
              ? "border-black/20 text-studio-text hover:border-black/45 hover:text-black focus-visible:ring-black/60 focus-visible:ring-offset-studio-surface"
              : undefined
          }
        >
          {ctaLabel}
        </StudioButton>
      </div>
    </article>
  );
}