import type { LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";

import { authenticate } from "../shopify.server";
import {
  ensureStoreConnection,
  findCurrentPrincipal,
  identityFromSession,
} from "../services/identity.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const identity = identityFromSession(session);
  await ensureStoreConnection(admin, session);
  const principal = await findCurrentPrincipal(identity);

  if (!principal) {
    throw new Response("Verify your email before managing stores", {
      status: 403,
    });
  }

  return {
    email: principal.appUser.email,
    workspaces: principal.appUser.memberships.map(
      (membership) => membership.workspace,
    ),
    installUrl: process.env.SHOPIFY_APP_INSTALL_URL ?? null,
  };
};

export default function ManageStores() {
  const data = useLoaderData<typeof loader>();

  return (
    <s-page heading="Manage stores" inlineSize="large">
      <s-link slot="breadcrumb-actions" href="/app">
        Home
      </s-link>
      {data.installUrl ? (
        <s-button slot="primary-action" href={data.installUrl} target="_blank">
          Install on another store
        </s-button>
      ) : null}
      {data.workspaces.map((workspace) => (
        <s-section key={workspace.id} heading={workspace.name}>
          <s-table variant="auto">
            <s-table-header-row>
              <s-table-header listSlot="primary">Store</s-table-header>
              <s-table-header>Domain</s-table-header>
              <s-table-header>Status</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {workspace.stores.map((store) => (
                <s-table-row key={store.id}>
                  <s-table-cell>{store.displayName}</s-table-cell>
                  <s-table-cell>{store.shopDomain}</s-table-cell>
                  <s-table-cell>
                    <s-badge
                      tone={store.status === "ACTIVE" ? "success" : "critical"}
                    >
                      {store.status === "ACTIVE" ? "Connected" : "Disconnected"}
                    </s-badge>
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        </s-section>
      ))}
      <s-section heading="Add another store">
        <s-paragraph>
          Install this public app on the other Shopify store, open it there,
          verify {data.email}, and select one of these workspaces.
        </s-paragraph>
      </s-section>
      <s-section heading="Disconnect a store">
        <s-paragraph>
          Uninstall Alvand from that store in Shopify Admin under
          Settings → Apps and sales channels. Its connection will be marked
          disconnected automatically without affecting the other stores in the
          workspace.
        </s-paragraph>
      </s-section>
      <s-section heading="Delete app account">
        <s-banner tone="warning">
          This removes your verified identity and workspace links. It does not
          uninstall the Shopify app from any store.
        </s-banner>
        <Form method="post" action="/app/account">
          <input type="hidden" name="intent" value="delete_account" />
          <s-stack direction="block" gap="base">
            <s-checkbox
              label="I understand that this cannot be undone"
              name="confirm"
              value="yes"
              required
            />
            <s-button type="submit" tone="critical">
              Delete account
            </s-button>
          </s-stack>
        </Form>
      </s-section>
    </s-page>
  );
}
