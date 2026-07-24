import Link from "next/link";
import { StudioTag } from "@/components/studio";

type DigitalServiceCardProps = {
  title: string;
  summary: string;
  href: string;
  tags?: string[];
};

export default function DigitalServiceCard({ title, summary, href, tags = [] }: DigitalServiceCardProps) {
  return (
    <article className="rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-6 md:p-7">
      <h3 className="text-xl font-medium tracking-tight text-studio-text md:text-2xl">{title}</h3>
      <p className="mt-4 text-sm leading-relaxed text-studio-muted md:text-base">{summary}</p>
      {tags.length > 0 ? (
        <ul className="mt-5 flex flex-wrap gap-2.5" aria-label={`${title} tags`}>
          {tags.map((tag) => (
            <li key={tag}>
              <StudioTag>{tag}</StudioTag>
            </li>
          ))}
        </ul>
      ) : null}
      <Link
        href={href}
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-studio-muted transition-colors hover:text-studio-text focus-visible:text-studio-text focus-visible:outline-none"
      >
        Learn more
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
