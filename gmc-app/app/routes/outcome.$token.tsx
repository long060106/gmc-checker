// Public page reached from the day-14 outcome email: /outcome/<token>
// Email security scanners open every link in an email, so a GET never records anything.
// The answer is saved only when the person presses a button (POST).
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { Form, data, useActionData, useLoaderData, useNavigation } from "react-router";

import prisma from "../db.server";

import styles from "./scan/styles.module.css";

export const meta: MetaFunction = () => [
  { title: "Did Google finish your review?" },
  { name: "robots", content: "noindex, nofollow" },
];

const ANSWERS = {
  reinstated: "Reinstated",
  rejected: "Rejected",
  pending: "Still waiting",
} as const;
type Answer = keyof typeof ANSWERS;
const isAnswer = (v: unknown): v is Answer => typeof v === "string" && v in ANSWERS;

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const token = params.token ?? "";
  const entry = token
    ? await prisma.waitlistEntry.findUnique({
        where: { outcomeToken: token },
        select: { outcomeAnswer: true },
      })
    : null;
  if (!entry) return data({ found: false as const }, { status: 404 });
  const picked = new URL(request.url).searchParams.get("a");
  return {
    found: true as const,
    previous: isAnswer(entry.outcomeAnswer) ? entry.outcomeAnswer : null,
    picked: isAnswer(picked) ? picked : null, // from the email link; only highlights a button
  };
};

export const action = async ({ params, request }: ActionFunctionArgs) => {
  const token = params.token ?? "";
  const form = await request.formData();
  const answer = form.get("answer");
  if (!isAnswer(answer)) return data({ ok: false as const, error: "Please pick one of the three answers." }, { status: 400 });
  const { count } = await prisma.waitlistEntry.updateMany({
    where: { outcomeToken: token },
    data: { outcomeAnswer: answer, outcomeAnsweredAt: new Date() },
  });
  if (!count) return data({ ok: false as const, error: "This link is no longer valid." }, { status: 404 });
  return { ok: true as const, answer };
};

export default function OutcomePage() {
  const loaded = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const nav = useNavigation();

  if (!loaded.found) {
    return (
      <main className={styles.page}>
        <h1 className={styles.h1}>This link is no longer valid</h1>
        <p className={styles.lede}>It may have expired or been typed incorrectly. Nothing was recorded.</p>
      </main>
    );
  }

  if (result?.ok) {
    return (
      <main className={styles.page}>
        <div className={styles.thanks} role="status">
          <h1 className={styles.h1}>Thanks, your answer is saved</h1>
          <p>
            You answered: <strong>{ANSWERS[result.answer]}</strong>.{" "}
            {result.answer === "pending"
              ? "Reviews can take up to 2 weeks or longer. You can come back to this link later and update your answer."
              : "You can change it by opening this link again."}
          </p>
          <p className={styles.muted}>
            We only use answers as counts (for example, how many people were reinstated). We never publish your email or
            your store.
          </p>
        </div>
      </main>
    );
  }

  const order: Answer[] = loaded.picked
    ? [loaded.picked, ...(Object.keys(ANSWERS) as Answer[]).filter((a) => a !== loaded.picked)]
    : (Object.keys(ANSWERS) as Answer[]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.h1}>Did Google finish reviewing your Merchant Center account?</h1>
        <p className={styles.lede}>One click. This tells us what happened after the fixes, nothing else.</p>
        {loaded.previous && (
          <p className={styles.muted}>
            Your last answer was <strong>{ANSWERS[loaded.previous]}</strong>. Pick again to update it.
          </p>
        )}
      </header>
      <Form method="post">
        {order.map((a) => (
          <p key={a}>
            <button className={styles.button} type="submit" name="answer" value={a} disabled={nav.state !== "idle"}>
              {ANSWERS[a]}
            </button>
          </p>
        ))}
      </Form>
      {result && !result.ok && <p className={styles.error}>{result.error}</p>}
      <footer className={styles.footer}>
        <p className={styles.small}>
          Independent tool, not affiliated with Google. Google alone decides on reviews and reinstatement.
        </p>
      </footer>
    </main>
  );
}
