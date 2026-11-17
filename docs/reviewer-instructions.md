# App review: test instructions + screencast script (Fixlog)

Updated 2026-11-16 for the production app **Fixlog** (`shopify.app.production.toml`, served from `https://gmc-checker-wgme.onrender.com`).

## Test instructions for Shopify's reviewer (paste into the submission form)
1. Install the app. You land on the app home ("Storefront check") inside Shopify admin, with no extra sign-in.
2. Click **Scan my store**. If your test store has a storefront password, the scan shows **"Your store is password-protected"** and most checks as not checked. That is correct: Google can't see a password-protected store either. To see a full report, turn off the password in Online Store → Preferences, then click **Scan again**.
3. Open **Merchant Center info**, enter any business name, phone, email and address, save, and scan again. The Identity and Contact checks now compare those values with the storefront.
4. Open **Before you request a review**, pick an issue label, click **I'm about to request a review**. The app re-scans and lists what changed since the first scan, with a review kit you can copy or download as .txt.
5. **Paid feature (one-time charge through Shopify Billing):** open **Reinstatement Pass** → **Get the pass for $39** → approve the charge. On a development store this is a test charge. Back in the app you see "Your pass is active until …", and scans and snapshots are no longer limited. **Request a refund of $39** on the same page ends the pass at once (7-day window, once per store); refunds are then issued manually from the Partner Dashboard.
6. Free plan limits, so you can see the paywall: 3 scans per 30 days and the first snapshot.
7. The app requests no access scopes and reads only the public storefront. No customer, order or product data is accessed or stored. Mandatory compliance webhooks are handled at `/webhooks/compliance`; `shop/redact` deletes all of the shop's data.

## Screencast script (English, about 2 minutes)
1. (0:00) Install from the listing → app home opens.
2. (0:15) Click "Scan my store" → report appears; open one finding to show the evidence, the Google rule link, and where to fix it.
3. (0:40) Merchant Center info → fill 4 fields → save → scan again → Identity/Contact results change.
4. (1:05) Fix one issue in the store (e.g. add a Contact page), go to "Before you request a review" → snapshot → the fixed check appears under "Changes made since …"; show the review kit.
5. (1:30) Reinstatement Pass → buy with a test charge → "Your pass is active until …".
6. (1:50) Show the privacy policy link and uninstall.

## Pre-submission checklist
- [x] Separate production app "Fixlog" with `application_url` = Render URL, compliance webhooks, `automatically_update_urls_on_dev = false` (released as fixlog-2, 2026-11-16)
- [x] App icon 1200×1200 uploaded (`docs/listing/icon-1200.png`, redraw with `docs/listing/make-icon.ps1`)
- [x] Privacy policy at `https://gmc-checker-wgme.onrender.com/privacy` covers the web checker and the Shopify app
- [ ] `SHOPIFY_API_SECRET` on Render = Fixlog's client secret (Long pastes it; see SETUP §4)
- [ ] Install Fixlog on the dev store and click through steps 1–6 above with no 404/500 (Req 2.1.1)
- [ ] `CONTACT_EMAIL` set on Render, so the privacy page shows a real contact email
- [ ] Public distribution chosen on the Fixlog app (Long only; can't be undone; SETUP §9.1)
- [ ] Emergency developer contact set (email + phone) in the Partner/Dev Dashboard (Long)
- [ ] 3–6 screenshots, 1600×900, of the Fixlog app (not the dev app, whose admin title is "Long Nguyen")
- [ ] Shopify "AI self-review" run on the submission page, issues fixed
- [ ] Listing text checked against the "Never write" list in `docs/listing-draft.md`
