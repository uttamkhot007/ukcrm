import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/25 hover:bg-destructive/90 hover:shadow-destructive/40",
        outline:
          "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-primary/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        glass:
          "bg-card/60 backdrop-blur-xl border border-border/50 text-foreground hover:bg-card/80 hover:border-border transition-all duration-300",
        sales:
          "bg-sales text-primary-foreground shadow-lg shadow-sales/25 hover:bg-sales/90 hover:shadow-sales/40 hover:scale-[1.02]",
        finance:
          "bg-finance text-primary-foreground shadow-lg shadow-finance/25 hover:bg-finance/90 hover:shadow-finance/40 hover:scale-[1.02]",
        hr:
          "bg-hr text-primary-foreground shadow-lg shadow-hr/25 hover:bg-hr/90 hover:shadow-hr/40 hover:scale-[1.02]",
        tech:
          "bg-tech text-primary-foreground shadow-lg shadow-tech/25 hover:bg-tech/90 hover:shadow-tech/40 hover:scale-[1.02]",
        support:
          "bg-support text-primary-foreground shadow-lg shadow-support/25 hover:bg-support/90 hover:shadow-support/40 hover:scale-[1.02]",
        marketing:
          "bg-marketing text-primary-foreground shadow-lg shadow-marketing/25 hover:bg-marketing/90 hover:shadow-marketing/40 hover:scale-[1.02]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
