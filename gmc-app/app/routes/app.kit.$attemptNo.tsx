// Review request kit for one attempt: what changed, what's still flagged, earlier requests.
// Viewing a kit is never gated: merchants keep their history even after the pass ends.
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import { loadKit } from "../lib/kit.server";
import { buildKitText } from "../lib/kit";
import { shopTimeZone } from "../lib/shop-timezone.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const attemptNo = Number(params.attemptNo);
  const [kit, timeZone] = await Promise.all([loadKit(session.shop, attemptNo), shopTimeZone(admin)]);
  if (!kit) return { found: false as const, attemptNo };
  return {
    found: true as const,
    attemptNo,
    text: buildKitText(kit, timeZone),
    fixedCount: kit.fixed.length,
    flaggedCount: kit.stillFlagged.length,
    compared: kit.baselineAt !== null,
  };
};

export default function Kit() {
  const data = useLoaderData<typeof loader>();
  const shopify = useAppBridge();

  if (!data.found) {
    return (
      <s-page heading="Review request kit">
        <s-section>
          <s-paragraph>There is no review request #{data.attemptNo} on record for this store.</s-paragraph>
          <s-link href="/app/snapshot">Go to your review requests</s-link>
        </s-section>
      </s-page>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.text);
      shopify.toast.show("Copied");
    } catch {
      shopify.toast.show("Select the text and copy it manually", { isError: true });
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([data.text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `review-request-${data.attemptNo}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <s-page heading={`Review request kit #${data.attemptNo}`}>
      <s-section>
        <s-stack direction="block" gap="base">
          <s-paragraph>
            {data.compared
              ? `${data.fixedCount} ${data.fixedCount === 1 ? "change" : "changes"} found since your previous scan, ${data.flaggedCount} ${data.flaggedCount === 1 ? "item" : "items"} still flagged. `
              : `${data.flaggedCount} ${data.flaggedCount === 1 ? "item" : "items"} flagged. `}
            Keep this with your records, and paste the relevant part into your review request if the form has a notes field.
          </s-paragraph>
          <s-stack direction="inline" gap="base">
            <s-button variant="primary" onClick={copy}>
              Copy
            </s-button>
            <s-button onClick={download}>Download .txt</s-button>
          </s-stack>
          <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{data.text}</pre>
          </s-box>
        </s-stack>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
