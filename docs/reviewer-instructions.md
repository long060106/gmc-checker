# App review: test instructions + screencast script (Fixlog)

Updated 2026-11-16 for the production app **Fixlog** (`shopify.app.production.toml`, served from `https://fixlog.me`; the old host `gmc-checker-wgme.onrender.com` still answers and redirects public pages).

## Test instructions for Shopify's reviewer (paste into the submission form)
1. Install the app. You land on the app home ("Storefront check") inside Shopify admin, with no extra sign-in.
2. Click **Scan my store**. Development stores are password-protected, so the first scan shows **"Your store is password-protected"** and most checks as not checked. That is correct: Google can't see a password-protected store either. To see the full report, copy the store password from **Online Store → Preferences**, paste it into **Storefront password** in that banner and click **Save and scan**. The app uses it only to open the store for scans (it can be removed from the side panel and is deleted on uninstall). "Store is public" stays flagged, because Google still can't see the store.
3. Open **Merchant Center info**, enter any business name, phone, email and address, save, and scan again. The Identity and Contact checks now compare those values with the storefront.
4. Open **Before you request a review**, pick an issue label, click **I'm about to request a review**. The app re-scans and lists what changed since the first scan, with a review kit you can copy or download as .txt.
5. **Paid feature (one-time charge through Shopify Billing):** open **Review Pass** → **Get the pass for $29** → approve the charge. On a development store this is a test charge. Back in the app you see "Your pass is active until …", and scans and snapshots are no longer limited. **Request a refund of $29** on the same page ends the pass at once (7-day window, once per store); refunds are then issued manually from the Partner Dashboard.
6. Free plan limits, so you can see the paywall: 3 scans per 30 days and the first snapshot.
7. The app requests no access scopes and reads only the public storefront. No customer, order or product data is accessed or stored. Mandatory compliance webhooks are handled at `/webhooks/compliance`; `shop/redact` deletes all of the shop's data.

Test credentials: none needed. The app has no separate login; it opens inside the Shopify admin after install.

## Screencast script
Moved to `docs/submission-guide.md`, part C (11 shots with English narration, recorded on a fresh dev store so the free plan → paywall → Pass flow fits exactly 3 scans and 1 snapshot).

## Pre-submission checklist
- [x] Separate production app "Fixlog" with `application_url` = Render URL, compliance webhooks, `automatically_update_urls_on_dev = false` (released as fixlog-2, 2026-11-16)
- [x] App icon 1200×1200 uploaded (`docs/listing/icon-1200.png`, redraw with `docs/listing/make-icon.ps1`)
- [x] Privacy policy at `https://fixlog.me/privacy` covers the web checker and the Shopify app
- [x] `SHOPIFY_API_SECRET` on Render = Fixlog's client secret (Long, 2026-11-20)
- [x] Install Fixlog on the dev store and click through steps 1–6 above with no 404/500 (Req 2.1.1): all passed 2026-11-21, including the Pass purchase (test charge) and the refund
  - 2026-11-21: installed on long-gmc-test; steps 1, 2 (password banner), 3 and 6 OK. Step 2 full report waits for Long to save the storefront password in the app. Step 5 fails until Public distribution is chosen: Shopify answers "Apps without a public distribution cannot use the Billing API" (the app shows "Purchase not started", nothing charged). After Public distribution was chosen, step 5 reaches Shopify's "Approve charge" page ("You will not be billed for this test charge"); Long approves it himself (terms + possibly a payment method). 2026-11-21 afternoon: storefront password saved, full report OK (10 of 19 passed); step 4 snapshot + kit OK after adding an About page; no approved Pass purchase reached the server yet.
- [x] `CONTACT_EMAIL` = support@fixlog.me on Render (2026-11-23; Namecheap forwards it to fixlog.support@proton.me). Fixlog's API contact email stays fixlog.support@proton.me (set 2026-11-21)
- [x] Public distribution chosen on the Fixlog app (Long, 2026-11-21)
- [ ] Emergency developer contact set (email + phone): Dev Dashboard → Organization settings → Organization (Long)
- [ ] Screencast recorded on a fresh dev store and its link pasted into the form (Long; `docs/submission-guide.md` part C)
- [x] App card subtitle and feature image ready (`docs/listing-draft.md`, `docs/listing/feature-image.png`, redrawn 2026-11-23)
- [x] 3–6 screenshots, 1600×900, of the Fixlog app (not the dev app, whose admin title is "Long Nguyen"): 5 done in `docs/listing/screenshots/` (retaken on fixlog-demo 2026-11-23)
- [ ] Shopify "AI self-review" run on the submission page, issues fixed
- [ ] Listing text checked against the "Never write" list in `docs/listing-draft.md`
