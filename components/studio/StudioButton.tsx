import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type StudioButtonVariant = "primary" | "secondary";

type StudioButtonBaseProps = {
  variant?: StudioButtonVariant;
  className?: string;
  children: ReactNode;
};

type StudioButtonLinkProps = StudioButtonBaseProps & {
  href: string;
  external?: boolean;
};

type StudioButtonNativeProps = StudioButtonBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
    external?: undefined;
  };

type StudioButtonProps = StudioButtonLinkProps | StudioButtonNativeProps;

const baseClass =
  "inline-flex min-h-11 items-center justify-center rounded-[11px] px-6 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-studio-base";

const variantClass: Record<StudioButtonVariant, string> = {
  primary: "bg-white font-semibold text-black hover:bg-neutral-200",
  secondary:
    "border border-studio-border bg-transparent font-medium text-studio-muted hover:border-white/35 hover:text-studio-text",
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function StudioButton(props: StudioButtonProps) {
  const { variant = "secondary", className, children } = props;
  const classes = joinClasses(baseClass, variantClass[variant], className);

  if ("href" in props && typeof props.href === "string") {
    if (props.external || props.href.startsWith("http") || props.href.startsWith("mailto:")) {
      return (
        <a
          href={props.href}
          className={classes}
          target={props.external && props.href.startsWith("http") ? "_blank" : undefined}
          rel={props.external && props.href.startsWith("http") ? "noopener noreferrer" : undefined}
        >
          {children}
        </a>
      );
    }

    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...buttonProps } = props;
  return (
    <button type={type} className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
