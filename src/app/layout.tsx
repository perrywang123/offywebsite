// Root layout — pass-through. The actual <html>/<body> and providers live in
// [locale]/layout.tsx (next-intl convention).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
