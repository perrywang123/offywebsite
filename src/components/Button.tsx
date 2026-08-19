import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "secondary" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary: "bg-ink text-cream hover:bg-brown-700",
  accent: "bg-accent text-cream hover:bg-accent-deep",
  secondary: "bg-transparent text-ink border border-sand hover:border-ink",
  ghost: "bg-transparent text-ink hover:bg-cream-deep",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-medium transition-colors duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
