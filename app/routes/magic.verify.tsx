import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";

import {
  consumeMagicLink,
  inspectMagicLink,
} from "../services/magic-link.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  return { ...(await inspectMagicLink(token)), token };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  return consumeMagicLink(String(formData.get("token") ?? ""));
};

export default function VerifyMagicLink() {
  const initialResult = useLoaderData<typeof loader>();
  const submittedResult = useActionData<typeof action>();

  if (!submittedResult && initialResult.ok) {
    return (
      <main
        style={{
          fontFamily: "Inter, sans-serif",
          maxWidth: 640,
          margin: "64px auto",
          padding: 24,
        }}
      >
        <h1>Confirm sign in</h1>
        <p>Continue to verify this email address for Alvand.</p>
        <Form method="post">
          <input type="hidden" name="token" value={initialResult.token} />
          <button type="submit">Verify email</button>
        </Form>
      </main>
    );
  }

  const result = submittedResult ?? initialResult;

  return (
    <main
      style={{
        fontFamily: "Inter, sans-serif",
        maxWidth: 640,
        margin: "64px auto",
        padding: 24,
      }}
    >
      <h1>{result.ok ? "Email verified" : "This link cannot be used"}</h1>
      <p>
        {result.ok
          ? "Return to Shopify Admin and reopen Alvand to continue."
          : result.reason === "conflict"
            ? "This Shopify user is already linked to a different app account. Contact support if you need to recover access."
            : "The sign-in link is missing, expired, or has already been used."}
      </p>
      {submittedResult?.ok && (
        <a
          href={`https://admin.shopify.com/store/${encodeURIComponent(
            submittedResult.shopDomain.replace(/\.myshopify\.com$/, ""),
          )}/apps`}
        >
          Return to Shopify Admin
        </a>
      )}
    </main>
  );
}
