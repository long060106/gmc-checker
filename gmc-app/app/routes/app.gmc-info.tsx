// The merchant's Merchant Center business info, typed in by them.
// Used by ID-01/ID-02 (business name) and CON-03 (phone, email, address must match the site).
// Stays in ShopProfile for this shop only; never copied into shared outcome data.
import { useEffect, useState } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";

const FIELDS = [
  { key: "gmcBusinessName", label: "Business name", details: "Exactly as shown in Merchant Center" },
  { key: "gmcPhone", label: "Customer service phone", details: "Include the country code, e.g. +1 555 123 4567" },
  { key: "gmcEmail", label: "Customer service email", details: "Google asks for an address on your own domain" },
  { key: "gmcAddress", label: "Business address", details: "Street, city, postal code" },
] as const;
type FieldKey = (typeof FIELDS)[number]["key"];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const p = await prisma.shopProfile.findUnique({ where: { shop: session.shop } });
  return {
    gmcBusinessName: p?.gmcBusinessName ?? "",
    gmcPhone: p?.gmcPhone ?? "",
    gmcEmail: p?.gmcEmail ?? "",
    gmcAddress: p?.gmcAddress ?? "",
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const form = await request.formData();
  const clean = (k: FieldKey, max: number) => String(form.get(k) ?? "").trim().slice(0, max) || null;
  const data = {
    gmcBusinessName: clean("gmcBusinessName", 120),
    gmcPhone: clean("gmcPhone", 40),
    gmcEmail: clean("gmcEmail", 254),
    gmcAddress: clean("gmcAddress", 300),
  };
  if (data.gmcEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.gmcEmail)) {
    return { ok: false as const, error: "That email address doesn't look right." };
  }
  await prisma.shopProfile.upsert({ where: { shop: session.shop }, create: { shop: session.shop, ...data }, update: data });
  return { ok: true as const };
};

export default function GmcInfo() {
  const initial = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const nav = useNavigation();
  const shopify = useAppBridge();
  const [values, setValues] = useState<Record<FieldKey, string>>(initial);

  useEffect(() => {
    if (result?.ok) shopify.toast.show("Saved. Scan again to use these details.");
  }, [result, shopify]);

  return (
    <s-page heading="Merchant Center info">
      <Form method="post">
        {/* Hidden inputs carry the values, so submission doesn't depend on web-component form support. */}
        {FIELDS.map((f) => (
          <input key={f.key} type="hidden" name={f.key} value={values[f.key]} />
        ))}
        <s-section heading="Copy these from Merchant Center → Settings → Business info">
          <s-stack direction="block" gap="base">
            <s-paragraph>
              The scan checks that your storefront shows the same name, phone, email and address. Mismatches between the two
              are a common reason for misrepresentation reviews to fail.
            </s-paragraph>
            {result && !result.ok ? (
              <s-banner tone="critical">
                <s-paragraph>{result.error}</s-paragraph>
              </s-banner>
            ) : null}
            {FIELDS.map((f) => (
              <s-text-field
                key={f.key}
                label={f.label}
                details={f.details}
                value={values[f.key]}
                onInput={(e) => {
                  const v = e.currentTarget.value;
                  setValues((prev) => ({ ...prev, [f.key]: v }));
                }}
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  setValues((prev) => ({ ...prev, [f.key]: v }));
                }}
              ></s-text-field>
            ))}
            <s-button type="submit" variant="primary" {...(nav.state === "submitting" ? { loading: true } : {})}>
              Save
            </s-button>
          </s-stack>
        </s-section>
      </Form>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
