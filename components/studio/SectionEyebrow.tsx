import type { ReactNode } from "react";

type SectionEyebrowProps = {
  children: ReactNode;
  className?: string;
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function SectionEyebrow({ children, className }: SectionEyebrowProps) {
  return (
    <p className={joinClasses("text-xs font-medium uppercase tracking-[0.3em] text-neutral-500", className)}>
      {children}
    </p>
  );
}
