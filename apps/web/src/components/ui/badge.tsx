import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-primary/15 text-primary",
        muted: "border-border bg-muted text-muted-foreground",
        warning: "border-primary/40 bg-accent text-accent-foreground",
        outline: "border-border bg-background text-foreground",
        primary: "border-primary bg-primary text-primary-foreground",
        secondary: "border-border bg-secondary text-secondary-foreground",
        success: "border-green-500/20 bg-green-500/15 text-green-700 dark:text-green-400",
        destructive: "border-destructive/20 bg-destructive/10 text-destructive",
        info: "border-violet-500/20 bg-violet-500/15 text-violet-700 dark:text-violet-400",
        "primary-light": "border-primary/20 bg-primary/10 text-primary",
        "primary-outline": "border-primary/30 bg-transparent text-primary",
        "success-light": "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-400",
        "destructive-light": "border-destructive/20 bg-destructive/10 text-destructive",
      },
      size: {
        xs: "px-1.5 py-0 text-[0.625rem]",
        sm: "px-2 py-0 text-[0.6875rem]",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-xs",
      },
      shape: {
        default: "rounded-full",
        circle: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      shape: "default",
    },
  },
);

const badgeButtonVariants = cva(
  "-mr-1 inline-flex size-4 cursor-pointer items-center justify-center rounded-full p-0 opacity-60 transition hover:bg-foreground/10 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg:not([class*='size-'])]:size-3",
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export interface BadgeButtonProps extends HTMLAttributes<HTMLSpanElement> {}

export type BadgeDotProps = HTMLAttributes<HTMLSpanElement>;

export function Badge({ className, variant, size, shape, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, shape }), className)}
      {...props}
    />
  );
}

export function BadgeButton({ className, role = "button", ...props }: BadgeButtonProps) {
  return (
    <span
      data-slot="badge-button"
      role={role}
      className={cn(badgeButtonVariants(), className)}
      {...props}
    />
  );
}

export function BadgeDot({ className, ...props }: BadgeDotProps) {
  return (
    <span
      data-slot="badge-dot"
      className={cn("size-1.5 rounded-full bg-current opacity-75", className)}
      {...props}
    />
  );
}

export { badgeVariants };
