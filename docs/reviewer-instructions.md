# App review: test instructions + screencast script (draft)

## Test instructions for Shopify's reviewer (paste into the submission form)
1. Install the app. You land on the app home inside Shopify admin (no extra sign-in).
2. If your test store has a storefront password, the first scan will show **"The store is password-protected"** and most checks as "Not checked" — this is correct behavior (Google can't see a password-protected store either). To see a full report, turn off the password in Online Store → Preferences, then click **Scan my store** again.
3. Open **Merchant Center info**, enter any business name, phone, email and address, save, and scan again: the Identity and Contact checks now compare those values with the storefront.
4. Open **Before you request a review**, pick a label, click **I'm about to request a review**: the app re-scans and lists what changed since the first scan.
5. The app requests no Admin API scopes and reads only the public storefront. No customer data is accessed or stored.
6. No paid plans at this time.

## Screencast script (English, ~2 minutes)
1. (0:00) Install from the listing → app home opens.
2. (0:15) Click "Scan my store" → report appears; open one finding to show evidence, the Google rule link, and where to fix it.
3. (0:45) Merchant Center info → fill 4 fields → save → rescan → Identity/Contact results change.
4. (1:15) Fix one issue in the store (e.g. add a Contact page), go to "Before you request a review" → snapshot → the fixed check appears under "Changes made since …".
5. (1:45) Show the privacy page link and uninstall.

## Pre-submission checklist
- [ ] `shopify.app.toml`: `client_id` linked, `application_url` = production URL, compliance webhooks present
- [ ] Production app loads with no 404/500 (Req 2.1.1)
- [ ] Privacy policy URL: `https://<app>/privacy`, with a real contact email
- [ ] Emergency developer contact set in the Partner Dashboard (Req 4.5.6)
- [ ] Shopify "AI self-review" run on the submission page, issues fixed
- [ ] Listing text checked against "Never write" list in `docs/listing-draft.md`
