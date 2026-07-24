import type { ReactNode } from "react";

type DigitalInfoPanelProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function DigitalInfoPanel({ title, children, className }: DigitalInfoPanelProps) {
  return (
    <section
      className={joinClasses(
        "rounded-2xl border border-studio-border/70 bg-studio-surface/65 p-6 md:p-7",
        className,
      )}
    >
      <h3 className="text-xl font-medium tracking-tight text-studio-text md:text-2xl">{title}</h3>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-studio-muted md:text-base">{children}</div>
    </section>
  );
}
