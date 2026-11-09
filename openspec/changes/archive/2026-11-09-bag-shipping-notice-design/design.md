# Bag shipping notice design

The shopper should read the shipping policy quickly before Checkout without mistaking it for a charge added to Subtotal. Reuse the existing Next.js/Tailwind component and the reference's icon–divider–text composition inside the current footer.

- Ink `#1d1915`: outline cart icon, subtotal and main action; muted ink `#525252`: readable policy text; line `#e3e3e3`: vertical divider; existing light footer and white bag surfaces remain.
- Keep the current system sans stack. Subtotal gains semibold emphasis; shipping remains 12px with generous 1.6 line height. Checkout retains its existing 48px height and focus/disabled states.
- Use a fixed 20px decorative icon, 12px spacing, a one-pixel vertical divider and 12px text inset. Align the icon to the grouped copy; reserve 20px below the notice for the action. Text must shrink and wrap, not push the footer wider. Balance these short paragraphs on narrow screens to avoid a lone USD suffix.
- No added card, badge, gradient, shadow, animation, new font or icon dependency. The grouping itself supplies hierarchy and matches Offy's restrained black/white/grey treatment.
- Verify 1440px desktop and 375px/320px phone layouts, short-height action visibility, long cart content scrolling, empty state and unchanged verified merchandise totals. Do not submit checkout or send production analytics during visual checks.
