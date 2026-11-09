import { Link } from "@/i18n/navigation";
import { CountryTrigger } from "@/components/market/CountrySelector";
/** Keep the destination controls and saved bag reachable after a regional 404. */
export default function ProductNotFound() {
  return (
    <div className="container-site section-y mx-auto max-w-2xl text-center">
      <p className="text-ink-muted mb-5 text-xs tracking-widest">A LITTLE OFFY, SOMEWHERE NEW</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        This look isn’t available here.
      </h1>
      <p className="text-ink-soft mx-auto mt-5 max-w-md text-sm leading-relaxed">
        This look may be unavailable for your shipping destination, or the link may have changed.
        You can choose another destination or explore the current collection.
      </p>
      <div className="mt-7 flex flex-col items-center gap-4">
        <CountryTrigger variant="menu" />
        <Link
          href="/products"
          className="bg-ink text-paper inline-flex min-h-12 items-center rounded-full px-7 text-sm"
        >
          Explore available OFFYs
        </Link>
      </div>
    </div>
  );
}
