"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Link } from "@/i18n/navigation";

type Scene = "catalog" | "product" | "bag" | "drawer" | "home";
const copy = {
  catalog: {
    title: "A little pause.",
    description: "We can’t load the collection right now. Please try again in a moment.",
  },
  product: {
    title: "This look is taking a moment.",
    description: "We can’t load this look right now. Please try again in a moment.",
  },
  bag: {
    title: "Your bag is safe.",
    description: "We can’t refresh your items right now. Your saved items are kept on this device.",
  },
  drawer: {
    title: "Your bag is safe.",
    description: "We can’t refresh your items right now. Your saved items are kept on this device.",
  },
  home: {
    title: "The collection is taking a moment.",
    description: "We can’t load the collection right now. There’s still more of OFFY to discover.",
  },
};
export function CommerceUnavailable({
  scene = "catalog",
  retry,
  heading = "h2",
}: {
  scene?: Scene;
  retry?: () => Promise<unknown>;
  heading?: "h1" | "h2";
}) {
  const router = useRouter(),
    [pending, startTransition] = useTransition(),
    [busy, setBusy] = useState(false),
    [attempted, setAttempted] = useState(false);
  const Heading = heading,
    compact = scene === "drawer";
  const run = () => {
    if (busy || pending) return;
    setAttempted(false);
    if (retry) {
      setBusy(true);
      void retry().finally(() => {
        setBusy(false);
        setAttempted(true);
      });
    } else {
      startTransition(() => {
        router.refresh();
        setAttempted(true);
      });
    }
  };
  return (
    <section
      data-commerce-unavailable={scene}
      className={`commerce-pause ${compact ? "commerce-pause--compact" : ""} ${scene === "home" ? "commerce-pause--home" : ""}`}
    >
      <div className="commerce-pause__copy">
        {compact && (
          <Image
            src="/assets/brand/is-offy-wordmark.png"
            alt=""
            width={124}
            height={65}
            className="mb-10 h-auto"
          />
        )}
        <p className="kicker mb-5">
          {scene === "bag" || compact ? "SAVED, NOT GONE." : "OFFLINE, FOR A MOMENT."}
        </p>
        <Heading className="font-display text-[clamp(36px,5vw,68px)] leading-[1.08] font-semibold tracking-tight">
          {copy[scene].title}
        </Heading>
        <p className="text-ink-soft mt-5 max-w-[43ch] text-base leading-7">
          {copy[scene].description}
        </p>
        {(scene === "bag" || compact) && (
          <p className="text-ink-soft mt-4 max-w-[43ch] text-sm leading-6">
            Once your items are up to date, you can check out. Nothing needs to be added again.
          </p>
        )}
        <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
          <button
            type="button"
            onClick={run}
            disabled={busy || pending}
            aria-busy={busy || pending}
            className="focus-ring bg-ink text-paper inline-flex min-h-12 items-center justify-center rounded-full px-8 text-sm font-medium disabled:opacity-60"
          >
            {busy || pending ? "Trying again…" : "Try again"}
          </button>
          <Link
            className="link-line tap-target text-sm"
            href={scene === "product" ? "/products" : "/about"}
          >
            {scene === "product" ? "All looks" : "Our story"}
          </Link>
        </div>
        <p role="status" aria-live="polite" className="text-ink-soft mt-3 min-h-6 text-xs">
          {attempted && !busy && !pending
            ? "Still taking a moment? You can try again whenever you’re ready."
            : ""}
        </p>
        <p className="text-ink-soft mt-6 text-xs">
          Need a hand?{" "}
          <Link href="/policies/contact" className="link-line tap-target--quiet">
            Contact us
          </Link>
        </p>
      </div>
      {!compact && scene !== "home" && (
        <div className="commerce-pause__mark" aria-hidden="true">
          <Image src="/assets/brand/is-offy-wordmark.png" alt="" width={196} height={103} />
          <p>OFFLINE, FOR A MOMENT.</p>
        </div>
      )}
    </section>
  );
}
