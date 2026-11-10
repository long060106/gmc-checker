// /unsubscribe/<token> — stop the outcome email.
// GET only shows a button (link scanners must not unsubscribe people by accident).
// POST unsubscribes. Mail providers' one-click unsubscribe (RFC 8058) POSTs "List-Unsubscribe=One-Click"
// to the same URL; that is handled by the same action and gets a 2xx response.
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { Form, data, useActionData, useLoaderData } from "react-router";

import prisma from "../db.server";

import styles from "./scan/styles.module.css";

export const meta: MetaFunction = () => [
  { title: "Unsubscribe" },
  { name: "robots", content: "noindex, nofollow" },
];

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const token = params.token ?? "";
  const entry = token
    ? await prisma.waitlistEntry.findUnique({ where: { outcomeToken: token }, select: { unsubscribed: true } })
    : null;
  if (!entry) return data({ found: false as const, unsubscribed: false }, { status: 404 });
  return { found: true as const, unsubscribed: entry.unsubscribed };
};

export const action = async ({ params }: ActionFunctionArgs) => {
  // Both the page button and RFC 8058 one-click land here. The body doesn't change what we do.
  const token = params.token ?? "";
  if (token) {
    await prisma.waitlistEntry.updateMany({ where: { outcomeToken: token }, data: { unsubscribed: true } });
  }
  // Always 200: one-click clients only need a 2xx, and we don't reveal whether a token exists.
  return { done: true as const };
};

export default function UnsubscribePage() {
  const loaded = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();

  if (result?.done || (loaded.found && loaded.unsubscribed)) {
    return (
      <main className={styles.page}>
        <h1 className={styles.h1}>You're unsubscribed</h1>
        <p className={styles.lede}>We won't send you the outcome email.</p>
      </main>
    );
  }
  if (!loaded.found) {
    return (
      <main className={styles.page}>
        <h1 className={styles.h1}>This link is no longer valid</h1>
        <p className={styles.lede}>Nothing was changed.</p>
      </main>
    );
  }
  return (
    <main className={styles.page}>
      <h1 className={styles.h1}>Stop the outcome email?</h1>
      <p className={styles.lede}>This only affects the one-question email about your Merchant Center review.</p>
      <Form method="post">
        <button className={styles.button} type="submit">
          Unsubscribe
        </button>
      </Form>
    </main>
  );
}
