import type { LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData } from "react-router";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { installUrl: process.env.SHOPIFY_APP_INSTALL_URL ?? null };
};

export default function App() {
  const { installUrl } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Alvand</h1>
        <p className={styles.text}>
          See a live product total for one Shopify store or all of your
          connected stores.
        </p>
        {installUrl ? (
          <a className={styles.button} href={installUrl}>
            View the app listing
          </a>
        ) : (
          <p className={styles.text}>
            Install this app from its Shopify App Store listing.
          </p>
        )}
        <ul className={styles.list}>
          <li>
            <strong>Exact totals</strong> with no 10,000-product ceiling.
          </li>
          <li>
            <strong>Multi-store workspaces</strong> with strict owner isolation.
          </li>
          <li>
            <strong>Privacy first</strong>: product records are never stored.
          </li>
        </ul>
        <p className={styles.text}>
          <a href="/legal/privacy">Privacy</a>
          {" · "}
          <a href="/legal/terms">Terms</a>
          {" · "}
          <a href="/support">Support</a>
          {" · "}
          <a href="/status">Status</a>
        </p>
      </div>
    </div>
  );
}
