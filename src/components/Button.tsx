import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "secondary" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary: "bg-ink-900 text-paper hover:bg-cocoa-600",
  accent: "bg-pop-coral text-paper hover:bg-[#e63d20]",
  secondary: "bg-paper text-ink-900 border border-sand-200 hover:border-ink-900",
  ghost: "bg-transparent text-ink-900 hover:bg-cream-100",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
