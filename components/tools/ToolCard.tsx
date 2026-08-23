import { StudioButton, StudioTag } from "@/components/studio";

type ToolCardProps = {
  title: string;
  summary: string;
  href: string;
  features: string[];
  platform: string;
  availability: string;
};

export default function ToolCard({
  title,
  summary,
  href,
  features,
  platform,
  availability,
}: ToolCardProps) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-6 md:p-7">
      <div className="flex flex-wrap gap-2.5">
        <StudioTag>{platform}</StudioTag>
        <StudioTag>{availability}</StudioTag>
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
              className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-studio-border"
              aria-hidden="true"
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex-1" />
      <div className="border-t border-studio-border/60 pt-6">
        <StudioButton href={href} variant="secondary">
          View Image Resizer
        </StudioButton>
      </div>
    </article>
  );
}