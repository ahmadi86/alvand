import type { LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";

import { consumeMagicLink } from "../services/magic-link.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  return consumeMagicLink(url.searchParams.get("token") ?? "");
};

export default function VerifyMagicLink() {
  const result = useLoaderData<typeof loader>();

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
      {result.ok && (
        <Link to={`/app?shop=${encodeURIComponent(result.shopDomain)}`}>
          Continue to the app
        </Link>
      )}
    </main>
  );
}
