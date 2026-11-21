# Shopify App Store listing — draft (for Long to edit)

**Chosen 2026-11-16:** listing name **Fixlog – GMC Review Prep**; app name in the Dev Dashboard **Fixlog** (Req 4.1.1 only needs the two to share a word). Icon: `docs/listing/icon-1200.png` (already uploaded to the Fixlog app). Privacy policy URL: `https://gmc-checker-wgme.onrender.com/privacy`.

Rules this draft follows (App Store requirements, read 2026-11-09): name ≤ 30 characters, brand first, not leading with a platform or business name (Req 4.1.2); no guarantees or "best/first/only" (Req 4.3.3); pricing only in the pricing section (Req 4.2); no Shopify logos in images (Req 4.4.3). Character counts were measured, not estimated.

## Name (pick one, then search the App Store to make sure it's unique)
| Option | Chars | Note |
|---|---|---|
| ~~Recheck: Merchant Center Prep~~ | 29 | **Taken (checked 2026-11-16):** "Recheck Order Editing & Upsell" already uses the brand "Recheck" (Built for Shopify, 18 reviews). Names must be unique and brand-led, so don't use it. |
| **Fixlog – GMC Review Prep** ✅ chosen 2026-11-16 | 24 | Says the wedge (a log of fixes). No app named "Fixlog" found on 2026-11-16 (closest: "Foxlog Fulfillment"). Two small consumer iOS apps are called "FixLog" (a personal fix journal, a home-maintenance log); different market. |
| Prereview: GMC Policy Check | 27 | "Pre-review" = before you request a review. No app named "Prereview" found on 2026-11-16. |

New Merchant Center apps seen in the same searches (2026-11-16), not yet profiled: "Preflight Merchant Center Scan", "GMC Fix Map", "FeedFix: Merchant Center Fix".

## App introduction (≤ 100)
> Check your storefront against Google's published Merchant Center rules and track what you fix.

## App details (≤ 500)
> Suspended by Merchant Center and the notice doesn't say why? This app reads your public storefront the way Google's crawler does and checks it against Google's published website, contact, policy and pricing rules. Every finding shows what we saw, the Google help page it comes from, and where to fix it in Shopify. Before you request a review, take a snapshot: you get a dated list of what changed since your last scan. Independent tool, not affiliated with Google. Google alone decides on reviews.

## Feature list (≤ 80 each)
- Scan your storefront against Google's published Merchant Center rules
- Every finding shows evidence, Google's rule, and where to fix it in Shopify
- Pre-review snapshot: see exactly what changed since your last scan
- Review request kit: what changed, what's still flagged, your earlier requests
- Dated history of your review requests and their outcomes
- Reads only your public storefront. No customer or order data

## Search terms (≤ 5)
merchant center suspended · misrepresentation · website needs improvement · google shopping policy · gmc compliance

## Pricing section
- **Free:** every finding of every scan, 3 scans per 30 days, the first pre-review snapshot and review kit, review history.
- **Reinstatement Pass, $39 one-time (60 days):** unlimited scans, a snapshot and review kit for every review request. No subscription; charged once through Shopify Billing. 7-day refund from inside the app, once per store (a refund for the tool, not tied to Google's decision).
- In the Partner Dashboard pricing form, list both. The app code is in `gmc-app/app/lib/pass.ts` (limits) and `app/routes/app.pass.tsx` (purchase page).

## Screenshots (3–6, 1600×900, no PII, no prices, no outcome promises)
Files in `docs/listing/screenshots/` (taken 2026-11-21 on long-gmc-test, Fixlog app; cropped with `docs/listing/crop-screenshot.ps1`):
1. Report summary + Site group: **todo, after the Pass is active** (the free-plan side panel shows the $39 price).
2. `2-policy-findings.png`: findings with evidence, "Where to fix" and "Google's rule".
3. `3-merchant-center-info.png`: Merchant Center info form (made-up test data).
4. `4-pre-review-snapshot.png`: "Changes made since …" list after adding an About page.
5. `5-review-kit.png`: review request kit with Copy / Download .txt.
Avoid the "Support email uses your store's domain" finding: on long-gmc-test it shows Long's personal Gmail.

## Never write (anywhere: listing, app, ads, forum)
"get reinstated", "fix your suspension", "approval chance", "readiness score", "guaranteed", "Google-approved", "official".
