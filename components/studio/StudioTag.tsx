import type { ReactNode } from "react";

type StudioTagProps = {
  children: ReactNode;
  className?: string;
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function StudioTag({ children, className }: StudioTagProps) {
  return (
    <span
      className={joinClasses(
        "inline-flex rounded-full border border-studio-border bg-studio-surface-soft/80 px-3 py-1 text-[0.68rem] uppercase tracking-[0.12em] text-studio-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
