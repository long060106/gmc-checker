// Privacy policy for the public web checker (/scan) and waitlist.
import type { MetaFunction } from "react-router";
import type { CSSProperties } from "react";
import { Link, useLoaderData } from "react-router";

export const meta: MetaFunction = () => [{ title: "Privacy policy — storefront check" }];

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
      <p>Last updated: November 9, 2026.</p>
      <p>
        This policy covers the free storefront check at <Link to="/scan">/scan</Link> and its waitlist. We collect as
        little as we can.
      </p>

      <h2>What we collect</h2>
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
          <strong>Your email, only if you join the waitlist.</strong> With it, your optional answers about whether your
          Merchant Center account is suspended and which issue it shows, and whether you asked for the 14-day follow-up
          email.
        </li>
        <li>
          <strong>Your IP address, briefly,</strong> in server memory to limit how many scans one network can run. It is
          not written to our database.
        </li>
      </ul>
      <p>
        We do not collect any data about your store's customers, orders or payments. The check only reads pages that
        anyone on the internet can see.
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
        <li>Scan results (hashed store key, no address): kept for aggregate statistics.</li>
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
