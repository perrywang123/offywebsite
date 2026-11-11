# About / Our Story design contract

Status: implemented and locally verified; production unchanged, 2026-11-11. Inputs: `关于我们.psd` (3250×4361) and `IP故事背景介绍.psd` (3251×21286), supplied by the owner. Product, interaction and visual specialists reviewed both sources independently. Source PSDs remain outside Git.

## Goal and composition

`/about` is a brand invitation: Where She Came From → four original manifesto paragraphs → OFFY / Gia visual pairing → EXPLORE OUR STORY. Remove the prior long narrative, future-IP and collaboration blocks from this page. The CTA opens `/our-story` in the same tab. No new header/menu items are needed.

`/our-story` is the full source story: black-and-white face banner, 1. THE CREATOR, 2. THE WORLD OF OFFY, 3. THE WORLD OF OFFY, THE OFFY COLLECTION / copyright. Keep the repeated chapter title because it is in the original. Use distinct chapter IDs and preserve both different In Gia's Own Words passages. Top and bottom Back to About links work even after direct entry.

## Visual direction

White editorial pages, black ink headings and restrained gray supporting text. Existing system sans/display fonts and storefront shell. Original drawings and portrait form the central visual pairing; do not introduce decorative cards, gradients, commerce cards, invented copy or a floating table of contents.

Desktop About: centered title 48–56px, manifesto 30–42px, weight 400 in an approximately 1200px maximum measure, generous 64–96px rhythm; paired art and portrait retain their separate source proportions. Mobile: title 32–36px, manifesto 20–22px, 20–24px gutters and natural line wraps. Keep the pair side by side with a 12px gap, with illustration contained and portrait framing preserved. CTA 52–56px mobile / 80px desktop, bounded width, original black capsule, clear focus ring.

Story: main reading measure at most 1120px; copy at most about 78ch; desktop body 18–21px, mobile 17–18px / 1.65–1.75 line height. Numbered h2 chapters and h3 subheadings. Creator photo/text are two columns on desktop, sequential on mobile; no tight float around a phone portrait. The image is the source's longer crop, not the shorter About crop. Quote uses a fine left border and accessible gray text. Four separate original sketch panels use a two-column desktop grid and one column on phones. Collection's large prototype and the smaller character roster separate vertically on mobile; preserve the roster with a full-size asset link if its density warrants it.

## Content and accessibility

All English narrative, headings, quote and IP notice are native text. Only illustration marks and embedded handwriting stay in images. Correct CameFrom spacing, the accidental v in vdon't and layout-only line-break artifacts; do not otherwise rewrite the source. No automatic translation or new commercial statements. An sr-only h1 can name the story without altering the PSD's banner. Shared layout already owns main. Long-form content is visible without reveal/intersection thresholds. Artwork uses intrinsic dimensions and contain as appropriate, no stretching; decorative banner has empty alt, portrait has meaningful alt.

CTA is a real Link. Controls have at least a 44px hit area and visible keyboard focus. Return links are ordinary links; no local storage, browser-history-only back button, modal gallery or new animation. Long text, zoom and fonts must expand naturally, not overlap or clip. Keep shared Header/Footer, country and bag unchanged.

## Verification

Native content/routing/metadata tests first. Actual local built app at 320/375/390, 768, 1440 and 1920px: no horizontal overflow, image distortion or clipped copy; complete section order. Test CTA / refresh / return / browser back, keyboard focus, 200% text stress and reduced motion; inspect top/middle/end screenshots. Verify all source narrative is present and original commercial data remains Shopify-only. Do not place test orders, write server data or deploy production.
