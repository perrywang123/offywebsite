"use client";
/** Identity only: no previous market's title, image or price is carried over. */
export function UnavailableBagLine({
  quantity,
  onRemove,
}: {
  quantity: number;
  onRemove: () => void;
}) {
  return (
    <li className="border-cream-line flex items-center justify-between gap-4 border-b p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">Item unavailable for this destination</p>
        <p className="text-ink-muted mt-2 text-xs leading-relaxed">
          Quantity: {quantity}. Change your destination or remove this item to continue.
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="tap-target--quiet shrink-0 text-xs underline"
      >
        Remove
      </button>
    </li>
  );
}
