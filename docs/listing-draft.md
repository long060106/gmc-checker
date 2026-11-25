# Shopify App Store listing — draft (for Long to edit)

**Chosen 2026-11-16:** listing name **Fixlog – GMC Review Prep**; app name in the Dev Dashboard **Fixlog** (Req 4.1.1 only needs the two to share a word). Icon: `docs/listing/icon-1200.png` (already uploaded to the Fixlog app). Privacy policy URL: `https://fixlog.me/privacy`.

Rules this draft follows (App Store requirements, read 2026-11-09): name ≤ 30 characters, brand first, not leading with a platform or business name (Req 4.1.2); no guarantees or "best/first/only" (Req 4.3.3); pricing only in the pricing section (Req 4.2); no Shopify logos in images (Req 4.4.3). Character counts were measured, not estimated.

## Name (pick one, then search the App Store to make sure it's unique)
| Option | Chars | Note |
|---|---|---|
| ~~Recheck: Merchant Center Prep~~ | 29 | **Taken (checked 2026-11-16):** "Recheck Order Editing & Upsell" already uses the brand "Recheck" (Built for Shopify, 18 reviews). Names must be unique and brand-led, so don't use it. |
| **Fixlog – GMC Review Prep** ✅ chosen 2026-11-16 | 24 | Says the wedge (a log of fixes). No app named "Fixlog" found on 2026-11-16 (closest: "Foxlog Fulfillment"). Two small consumer iOS apps are called "FixLog" (a personal fix journal, a home-maintenance log); different market. |
| Prereview: GMC Policy Check | 27 | "Pre-review" = before you request a review. No app named "Prereview" found on 2026-11-16. |

New Merchant Center apps seen in the same searches (2026-11-16), not yet profiled: "Preflight Merchant Center Scan", "GMC Fix Map", "FeedFix: Merchant Center Fix".

**Feedback 2026-11-25 (points 6 and 14), Long to decide:** a tester read "Fixlog" and "Fixlog – GMC Review Prep" as two names, and said merchants say "Google Shopping", not "GMC". The two-part name is normal on the App Store (brand + descriptor, Req 4.1.1). Option: "Fixlog – Merchant Center Prep" (28 characters) spells out GMC. Avoid "Google Shopping" in the name itself (Google's trademark); it is used in the details text below instead.

## App card subtitle (benefit, no keywords or stats)
> Know what to fix and what changed before you request a review

61 characters. Backup: "Check your store against Google rules before a GMC review" (57).

## Feature media
`docs/listing/feature-image.png` (1600×900, drawn by `docs/listing/make-feature-image.ps1`): headline "See which checks changed" plus the pre-review snapshot screenshot. Alt text: "Fixlog snapshot listing which checks changed before a Merchant Center review request".

## App introduction (≤ 100)
> Check your storefront against Google's Merchant Center website rules and track what you fix.

## App details (≤ 500)
> Suspended in Google Merchant Center (Google Shopping) and the notice doesn't say why? Fixlog checks your public store pages against Google's published website, contact, policy and pricing rules. Every finding shows what we saw, the Google help page and where to fix it in Shopify. Before you request a review, take a snapshot: a fresh scan compared with your first. It becomes your review kit: a dated record of what changed. Independent tool, not affiliated with Google. Google alone decides.

## Feature list (≤ 80 each)
- Check your storefront against website rules in Google's Merchant Center help
- Every finding shows evidence, Google's rule, and where to fix it in Shopify
- Pre-review snapshot: what changed since your first scan or last request
- Review request kit: what changed, what's still flagged, your earlier requests
- Dated history of your review requests and the outcomes you record
- Requests no access scopes, so it can't read customers, orders or products

## Search terms (≤ 5)
merchant center suspended · misrepresentation · website needs improvement · google shopping policy · gmc compliance

## Pricing section
- **Free:** every finding of every scan, 3 scans per 30 days, the first pre-review snapshot and review kit, review history.
- **Review Pass, $29 one-time (60 days):** unlimited scans, a snapshot and review kit for every review request. No subscription; charged once through Shopify Billing. 7-day refund from inside the app, once per store (a refund for the tool, not tied to Google's decision).
- In the Partner Dashboard pricing form, list both. The app code is in `gmc-app/app/lib/pass.ts` (limits) and `app/routes/app.pass.tsx` (purchase page).
- Shopify's charge approval screen says one-time purchases are "non-refundable" (feedback 2026-11-25, point 1). The purchase page now says that this is Shopify's standard text and that Fixlog's 7-day refund still applies. Long issues it in the Partner Dashboard (charge → Issue refund); `npm run refunds` lists open requests.
- Pricing limits (3 free scans per 30 days in the app vs unlimited on the web /scan page) are under review after the same feedback (points 10 and 11). Don't submit this section until Long decides.

## Install screen note (feedback 2026-11-25, point 2)
Shopify's install screen shows "Staff and contributors: Store owner" data (name, email, phone, address) even though Fixlog requests no scopes, because every installed app can read the shop's basic details. Fixlog doesn't read them. The privacy policy (fixlog.me/privacy, updated 2026-11-25) explains this. The app only queries `shop.plan.partnerDevelopment`, `currentAppInstallation.oneTimePurchases` and `shop.ianaTimezone`.

## Screenshots (3–6, 1600×900, no PII, no prices, no outcome promises)
Files in `docs/listing/screenshots/` (retaken 2026-11-23 on the fixlog-demo store, Fixlog app, so no "Long GMC Test" name or long-gmc-test URL appears; cropped with `docs/listing/crop-screenshot.ps1`):
1. `1-findings-site-identity.png`: "Social links" and Identity findings (Check / Pass) with the "About this check" side panel (no price shown).
2. `2-policy-findings.png`: Policies findings (Fix / Check) with evidence, "Where to fix" and "Google's rule".
3. `3-merchant-center-info.png`: Merchant Center info form filled with made-up test data (Fixlog Demo, +1 555 010 0199, support@example.com, 100 Test Street).
4. `4-pre-review-snapshot.png`: snapshot for attempt 2: "Changes made since Nov 23, 2026" (contact details now match Merchant Center, after the demo Contact page was edited) plus the still-flagged list.
5. `5-review-kit.png`: review request kit #2 with Copy / Download .txt and the record text.
The feature image is drawn from screenshot 4, so re-run `make-feature-image.ps1` whenever shot 4 changes.
Never take shots on long-gmc-test: its "Support email uses your store's domain" finding shows Long's personal Gmail.

## Never write (anywhere: listing, app, ads, forum)
"get reinstated", "fix your suspension", "approval chance", "readiness score", "guaranteed", "Google-approved", "official".
