import { useLoaderData } from "react-router";

import { PublicPage } from "../components/PublicPage";

export const meta = () => [{ title: "Support | Hello Product Count" }];
export const loader = () => ({
  supportEmail: process.env.SUPPORT_EMAIL ?? null,
});

export default function Support() {
  const { supportEmail } = useLoaderData<typeof loader>();
  return (
    <PublicPage title="Support">
      {supportEmail ? (
        <p>
          For installation, workspace access, account recovery, or product-count
          help, email <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
      ) : (
        <p>The production support contact has not been configured.</p>
      )}
      <p>
        Include the affected <code>.myshopify.com</code> domain, but never send
        access tokens or passwords.
      </p>
    </PublicPage>
  );
}
