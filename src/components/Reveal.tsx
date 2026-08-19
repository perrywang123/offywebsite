"use client";

import { useReveal, type RevealVariant } from "@/hooks/useReveal";

export function Reveal({
  variant = "up",
  delay = 0,
  className = "",
  children,
}: {
  variant?: RevealVariant;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useReveal<HTMLDivElement>({ variant, delay });
  return (
    <div ref={ref} data-variant={variant} className={`reveal ${className}`}>
      {children}
    </div>
  );
}
