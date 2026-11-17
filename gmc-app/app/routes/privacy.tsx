// Privacy policy for the public web checker (/scan) and waitlist.
import type { MetaFunction } from "react-router";
import type { CSSProperties } from "react";
import { Link, useLoaderData } from "react-router";

export const meta: MetaFunction = () => [{ title: "Privacy policy — Fixlog" }];

export const loader = () => ({ contactEmail: process.env.CONTACT_EMAIL?.trim() || null });

const wrap: CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "24px 16px 48px",
  fontFamily: 'Inter, -apple-system, "Segoe UI", Roboto, sans-serif',
  lineHeight: 1.6,
};

export default function Privacy() {
  const { contactEmail } = useLoaderData<typeof loader>();
  return (
    <main style={wrap}>
      <h1>Privacy policy</h1>
      <p>Last updated: November 16, 2026.</p>
      <p>
        This policy covers Fixlog: the free storefront check at <Link to="/scan">/scan</Link> with its waitlist, and
        the Fixlog app for Shopify. We collect as little as we can.
      </p>

      <h2>What we collect on the web checker (/scan)</h2>
      <ul>
        <li>
          <strong>The store address you scan.</strong> We fetch that store's public pages to run the checks. We do not
          store the address itself: we store a keyed one-way hash of the domain, so we can count repeat scans without
          keeping a list of stores.
        </li>
        <li>
          <strong>Scan results.</strong> Which checks passed, failed or could not run, plus the engine version. Not the
          page text.
        </li>
        <li>
          <strong>Your optional answers</strong> to &quot;Is your account suspended or warned?&quot; and &quot;Which
          issue?&quot;, and the tag on the link that brought you here (for example <code>?ref=reddit</code>). They are
          stored with the scan result, without your email, so we can count how many people who scan are suspended and
          which sites send them.
        </li>
        <li>
          <strong>Your email, only if you join the waitlist.</strong> With it, the same optional answers and whether you
          asked for the 14-day follow-up email.
        </li>
        <li>
          <strong>Your IP address, briefly,</strong> in server memory to limit how many scans one network can run. It is
          not written to our database.
        </li>
      </ul>
      <h2>What we collect in the Fixlog app for Shopify</h2>
      <ul>
        <li>
          <strong>Your shop&apos;s myshopify.com address and an access token</strong> issued by Shopify when you install
          the app, so the app can open inside your Shopify admin and use Shopify Billing. The app requests no access
          scopes, so it cannot read your products, orders or customers.
        </li>
        <li>
          <strong>The Merchant Center details you type in</strong> (business name, phone, email, address), if you choose
          to. They are only used to compare with what your storefront shows.
        </li>
        <li>
          <strong>Scan results and findings,</strong> including short excerpts of your public pages that a finding
          quotes as evidence.
        </li>
        <li>
          <strong>Your review requests:</strong> the suspension label you pick, the dates, which checks changed between
          snapshots, and the outcome you report.
        </li>
        <li>
          <strong>Refund requests:</strong> the purchase ID and the reason you give, if any. Payments are handled by
          Shopify Billing; we never see card or bank details.
        </li>
      </ul>
      <p>
        <strong>Sharing outcomes is opt-in.</strong> Only if you tick &quot;Share my anonymized fixes and
        outcome&quot; do we use that request (which checks changed and the outcome, without your store address) in
        aggregate statistics, and we only publish numbers for groups of at least 5 stores.
      </p>
      <p>
        We do not collect any data about your store&apos;s customers, orders or payments, in the app or on the web
        checker. Both only read pages that anyone on the internet can see.
      </p>

      <h2>Where it is stored</h2>
      <p>
        On servers run by Render (the web server) and Turso (the database), both in the United States. Emails are sent
        through Resend.
      </p>

      <h2>Why</h2>
      <ul>
        <li>To show you the report.</li>
        <li>To email you when the Shopify app launches (waitlist), and, only if you ticked the box, one follow-up email after 14 days.</li>
        <li>
          To learn, in aggregate and without store addresses, which fixes are followed by reinstatement. We only publish
          numbers for groups of at least 5 stores.
        </li>
      </ul>

      <h2>What we don't do</h2>
      <ul>
        <li>We don't sell or rent your data.</li>
        <li>We don't use your email for anything beyond what's listed above.</li>
        <li>We are not affiliated with Google or Shopify.</li>
      </ul>

      <h2>How long we keep it</h2>
      <ul>
        <li>Waitlist entries: until the app launches and you've been told, or until you ask us to delete them.</li>
        <li>Web checker scan results (hashed store key, no address): kept for aggregate statistics.</li>
        <li>
          Shopify app data: the access token is deleted when you uninstall. 48 hours after you uninstall, Shopify asks
          us to erase your shop&apos;s data and we delete everything the app stored for it: Merchant Center details,
          scans, findings, review history and refund requests.
        </li>
      </ul>

      <h2>Your choices</h2>
      <p>
        Every email we send has an unsubscribe link. You can ask us to delete your waitlist entry at any time
        {contactEmail ? (
          <>
            {" "}
            by writing to <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </>
        ) : (
          <> using the contact address that will be listed here before launch.</>
        )}
      </p>

      <p>
        <Link to="/scan">← Back to the checker</Link>
      </p>
    </main>
  );
}
