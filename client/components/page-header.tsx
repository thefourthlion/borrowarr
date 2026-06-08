"use client";

import clsx from "clsx";
import type { ReactNode } from "react";

type PageHeaderTone = "secondary" | "primary" | "danger" | "warning";
type PageHeaderWidth = "default" | "wide";

const toneStyles: Record<
  PageHeaderTone,
  { border: string; icon: string; title: string }
> = {
  secondary: {
    border: "border-secondary/20",
    icon: "bg-secondary/10 text-secondary",
    title: "from-secondary to-secondary-600",
  },
  primary: {
    border: "border-primary/20",
    icon: "bg-primary/10 text-primary",
    title: "from-primary to-secondary",
  },
  danger: {
    border: "border-danger/20",
    icon: "bg-danger/10 text-danger",
    title: "from-danger to-danger-600",
  },
  warning: {
    border: "border-warning/20",
    icon: "bg-warning/10 text-warning",
    title: "from-warning to-warning-600",
  },
};

const widthStyles: Record<PageHeaderWidth, string> = {
  default: "max-w-[1600px]",
  wide: "max-w-[2400px]",
};

export function PageHeader({
  title,
  description,
  icon,
  actions,
  tone = "secondary",
  width = "default",
  className,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  tone?: PageHeaderTone;
  width?: PageHeaderWidth;
  className?: string;
  children?: ReactNode;
}) {
  const styles = toneStyles[tone];

  return (
    <header
      className={clsx(
        "sticky top-16 z-10 mb-8 border-b bg-background/95 backdrop-blur-sm",
        styles.border,
        className,
      )}
    >
      <div
        className={clsx(
          "mx-auto w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8",
          widthStyles[width],
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {icon && (
              <div
                className={clsx(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  styles.icon,
                )}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h1
                className={clsx(
                  "truncate bg-gradient-to-r bg-clip-text text-2xl font-bold text-transparent sm:text-3xl",
                  styles.title,
                )}
              >
                {title}
              </h1>
              {description && (
                <p className="mt-1 text-sm text-foreground/60">{description}</p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>
          )}
        </div>
        {children && <div className="mt-5">{children}</div>}
      </div>
    </header>
  );
}

export function PageContent({
  children,
  width = "default",
  className,
}: {
  children: ReactNode;
  width?: PageHeaderWidth;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "mx-auto w-full px-4 pt-8 pb-6 sm:px-6 sm:pt-10 sm:pb-8 lg:px-8 lg:pb-10",
        widthStyles[width],
        className,
      )}
    >
      {children}
    </div>
  );
}
