import type { ReactNode } from "react";

type ServicePropositionCardProps = {
  title: string;
  intro: ReactNode;
  capabilities?: string[];
  footerLabel?: string;
  footerText?: ReactNode;
  compact?: boolean;
  className?: string;
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function ServicePropositionCard({
  title,
  intro,
  capabilities = [],
  footerLabel,
  footerText,
  compact = false,
  className,
}: ServicePropositionCardProps) {
  const hasFooter = Boolean(footerLabel || footerText);

  return (
    <section
      className={joinClasses(
        "flex h-full flex-col rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-6 md:p-7",
        compact ? "p-5 md:p-6" : undefined,
        className,
      )}
    >
      <h3 className={joinClasses("font-medium tracking-tight text-studio-text", compact ? "text-lg md:text-xl" : "text-xl md:text-2xl")}>{title}</h3>
      <div
        className={joinClasses(
          "mt-4 text-sm leading-relaxed text-studio-muted md:text-base",
          compact ? "md:text-sm" : undefined,
        )}
      >
        {intro}
      </div>

      {capabilities.length > 0 ? (
        <ul className="mt-5 space-y-2.5 text-sm leading-relaxed text-studio-muted md:text-base">
          {capabilities.map((capability) => (
            <li key={capability} className="flex gap-2">
              <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-studio-border" aria-hidden="true" />
              <span>{capability}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {hasFooter ? <div className="flex-1" /> : null}

      {hasFooter ? (
        <div className="mt-6 border-t border-studio-border/60 pt-4">
          {footerLabel ? (
            <p className="text-xs uppercase tracking-[0.16em] text-studio-dim">{footerLabel}</p>
          ) : null}
          {footerText ? (
            <p className={joinClasses("text-sm leading-relaxed text-studio-muted", footerLabel ? "mt-2" : undefined, compact ? "md:text-sm" : "md:text-base")}>{footerText}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}