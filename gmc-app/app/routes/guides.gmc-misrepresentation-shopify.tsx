// Public guide at /guides/gmc-misrepresentation-shopify: what Google's Merchant Center help pages list
// for a store's website, and where each item lives in Shopify. Every quote was checked against the
// linked Google page on 2026-11-23 (keep quotes short and re-check them when you edit this page).
// Words we never use here: get reinstated, fix your suspension, guaranteed, approval chance.
import type { ReactNode } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";

import { FIX, REF } from "../engine/refs";
import { legacyHostRedirect, siteOrigin } from "../lib/site.server";
import styles from "./scan/styles.module.css";

const TITLE = "Shopify GMC misrepresentation: what Google's help pages list";
const DESCRIPTION =
  "A checklist for Shopify stores from Google Merchant Center's own help pages, with the Shopify admin path for each fix and what to know before you request a review.";
const CHECKED_ON = "2026-11-23";

export const loader = ({ request }: LoaderFunctionArgs) => {
  const moved = legacyHostRedirect(request);
  if (moved) throw moved;
  return { canonical: `${siteOrigin(request)}/guides/gmc-misrepresentation-shopify` };
};

export const meta: MetaFunction<typeof loader> = ({ loaderData }) => [
  { title: `${TITLE} – Fixlog` },
  { name: "description", content: DESCRIPTION },
  ...(loaderData ? [{ tagName: "link", rel: "canonical", href: loaderData.canonical }] : []),
  { property: "og:title", content: TITLE },
  { property: "og:description", content: DESCRIPTION },
  { property: "og:type", content: "article" },
  ...(loaderData
    ? [
        {
          "script:ld+json": {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: TITLE,
            description: DESCRIPTION,
            dateModified: CHECKED_ON,
            mainEntityOfPage: loaderData.canonical,
            publisher: { "@type": "Organization", name: "Fixlog" },
          },
        },
      ]
    : []),
];

function Source({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export default function Guide() {
  useLoaderData<typeof loader>(); // canonical URL for meta only
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.small}>
          <Link to="/scan">Fixlog</Link> · Guide · Checked against Google&apos;s help pages on {CHECKED_ON}
        </p>
        <h1 className={styles.h1}>{TITLE}, and where to fix each item in Shopify</h1>
        <p className={styles.lede}>
          A Merchant Center suspension notice is short. Google&apos;s help pages are more specific about what a store&apos;s
          website should show. Below is each item, the Google page it comes from, and the Shopify setting that controls
          it. Only Google decides on reviews; this list covers the website side, not your product feed or account
          verification.
        </p>
      </header>

      <section className={styles.about}>
        <h2 className={styles.waitlistTitle}>1. Contact details</h2>
        <p>
          Google&apos;s <Source href={REF.editorial}>editorial requirements</Source> ask you to &quot;provide clear,
          accessible contact details on your online store.&quot; Its <Source href={REF.businessInfo}>business information
          page</Source> also asks you to include your domain name in the customer service email field in Merchant Center.
        </p>
        <ul className={styles.aboutList}>
          <li>Create a Contact page: {FIX.pages}. Link it in the header or footer: {FIX.navigation}.</li>
          <li>
            Show the same email, phone and address that Merchant Center has ({FIX.gmcBusinessInfo}), written the same
            way.
          </li>
        </ul>
      </section>

      <section className={styles.about}>
        <h2 className={styles.waitlistTitle}>2. Return and refund policy</h2>
        <p>
          The <Source href={REF.editorial}>same page</Source> asks you to outline return conditions, including
          &quot;acceptable timeframes, return methods, associated shipping fees&quot; and how refunds are processed.
        </p>
        <ul className={styles.aboutList}>
          <li>{FIX.refund}. State the number of days, how to send items back, who pays return shipping, and when refunds are issued.</li>
          <li>Link the policy in your footer menu: {FIX.navigation}.</li>
        </ul>
      </section>

      <section className={styles.about}>
        <h2 className={styles.waitlistTitle}>3. One business name everywhere</h2>
        <p>
          Google&apos;s <Source href={REF.trust}>trust page</Source> says to &quot;provide the official business name
          that you use across the web.&quot; Its <Source href={REF.businessName}>business name rules</Source> also limit
          what the name in Merchant Center may contain.
        </p>
        <ul className={styles.aboutList}>
          <li>
            Use one exact name in Merchant Center, your store name ({FIX.storeDetails}), the footer and your policies.
            &quot;ABC Company&quot; in Merchant Center but &quot;abccompany.com&quot; on the site is a mismatch.
          </li>
        </ul>
      </section>

      <section className={styles.about}>
        <h2 className={styles.waitlistTitle}>4. About page and social links</h2>
        <p>
          The <Source href={REF.trust}>trust page</Source> also suggests an &quot;about us&quot; page and linking your
          social media profiles. The <Source href={REF.websiteFix}>store functionality page</Source> says to
          &quot;check that your social media pages are linked correctly on your website.&quot;
        </p>
        <ul className={styles.aboutList}>
          <li>Add an About page that says who runs the store: {FIX.pages}.</li>
          <li>
            Check the social icons in your theme ({FIX.theme}) and fix any that still point to a theme default or to an
            empty profile.
          </li>
        </ul>
      </section>

      <section className={styles.about}>
        <h2 className={styles.waitlistTitle}>5. Placeholder text and broken links</h2>
        <p>
          Google&apos;s <Source href={REF.websiteFix}>store functionality page</Source> says to check your site for
          &quot;Lorem Ipsum&quot; text or default template images, and that links shouldn&apos;t lead to 404 errors or
          redirect back to the home page instead of the intended destination.
        </p>
        <ul className={styles.aboutList}>
          <li>Open each theme section ({FIX.theme}) and replace default text such as &quot;Talk about your brand&quot;.</li>
          <li>Click every header and footer link ({FIX.navigation}) and fix any that fail or land on the home page.</li>
          <li>Check your policies for template text left in brackets ({FIX.policies}).</li>
        </ul>
      </section>

      <section className={styles.about}>
        <h2 className={styles.waitlistTitle}>6. Prices on product pages</h2>
        <p>
          Google&apos;s <Source href={REF.priceMismatch}>price mismatch page</Source> says data passed with JavaScript
          after the page is loaded will trigger an error.
        </p>
        <ul className={styles.aboutList}>
          <li>
            Test a product page with Google&apos;s{" "}
            <Source href="https://search.google.com/test/rich-results">Rich Results Test</Source>: the price in the
            structured data should equal the price shown on the page.
          </li>
          <li>If a price app or theme script changes prices after the page loads, check what the page shows before it runs.</li>
        </ul>
      </section>

      <section className={styles.about}>
        <h2 className={styles.waitlistTitle}>7. The store has to be open</h2>
        <p>A password page means visitors, including Google, can&apos;t see your products or policies.</p>
        <ul className={styles.aboutList}>
          <li>Turn off password protection before you request a review: {FIX.preferences}.</li>
        </ul>
      </section>

      <section className={styles.about}>
        <h2 className={styles.waitlistTitle}>Before you click &quot;Request review&quot;</h2>
        <p>
          Google&apos;s <Source href={REF.requestReview}>review page</Source> says to &quot;wait 7 business days&quot; and
          that &quot;the review may take up to 2 weeks to complete.&quot; If issues aren&apos;t resolved by the second
          review attempt, a one-week cool-down may begin, and &quot;the cool down period may increase with each
          unsuccessful review.&quot; So fix everything you can first, keep a dated list of what you changed, and request
          once.
        </p>
      </section>

      <section className={styles.waitlist}>
        <h2 className={styles.waitlistTitle}>Check your store against this list</h2>
        <p className={styles.muted}>
          Fixlog&apos;s free check reads your public pages and shows every finding with the Google page it comes from and
          where to fix it in Shopify. It can&apos;t tell you whether Google will reinstate you.
        </p>
        <p>
          <Link className={styles.button} to="/scan">
            Check my store for free
          </Link>
        </p>
      </section>

      <footer className={styles.footer}>
        <p>
          Independent guide, not affiliated with Google. Google alone decides on reviews and reinstatement. Quotes are
          from the linked Google pages as read on {CHECKED_ON}; Google may change them.
        </p>
        <p>
          Fixlog is built by Long Nguyen, an independent developer. <Link to="/privacy">Privacy and contact</Link>
        </p>
      </footer>
    </main>
  );
}
