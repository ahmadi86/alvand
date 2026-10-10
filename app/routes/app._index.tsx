import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import {
  Form,
  useLoaderData,
  useNavigation,
  useRouteError,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";
import {
  ensureStoreConnection,
  findCurrentPrincipal,
  identityFromSession,
} from "../services/identity.server";
import { aggregateProductCounts } from "../services/product-count.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const identity = identityFromSession(session);
  const currentStore = await ensureStoreConnection(admin, session);
  const principal = await findCurrentPrincipal(identity);
  const url = new URL(request.url);
  const notice = url.searchParams.get("notice");

  if (!principal) {
    return {
      phase: "verify" as const,
      suggestedEmail: identity.email,
      firstName: identity.firstName,
      notice,
    };
  }

  const workspaces = principal.appUser.memberships.map(
    (membership) => membership.workspace,
  );
  const currentWorkspace = workspaces.find(
    (workspace) => workspace.id === currentStore.workspaceId,
  );

  if (currentStore.workspaceId && !currentWorkspace) {
    return {
      phase: "locked" as const,
      firstName: identity.firstName,
      shopDomain: currentStore.shopDomain,
    };
  }

  if (!currentStore.workspaceId) {
    return {
      phase: "workspace" as const,
      firstName: identity.firstName,
      currentStore,
      workspaces,
      notice,
    };
  }

  const requestedWorkspaceId = url.searchParams.get("workspace");
  const workspace =
    workspaces.find((item) => item.id === requestedWorkspaceId) ??
    currentWorkspace ??
    workspaces[0];

  if (!workspace) {
    throw new Response("No authorized workspace found", { status: 403 });
  }

  const activeStores = workspace.stores.filter(
    (store) => store.status === "ACTIVE",
  );
  const requestedStoreId = url.searchParams.get("store");
  const selectedStores =
    requestedStoreId && requestedStoreId !== "all"
      ? activeStores.filter((store) => store.id === requestedStoreId)
      : activeStores;
  const safeSelectedStores = selectedStores.length
    ? selectedStores
    : activeStores;
  const counts = await aggregateProductCounts(safeSelectedStores);

  return {
    phase: "ready" as const,
    firstName: identity.firstName,
    email: principal.appUser.email,
    currentStoreId: currentStore.id,
    workspace,
    workspaces,
    selectedStoreId: requestedStoreId ?? "all",
    counts,
    notice,
  };
};

export default function Index() {
  const data = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle";

  if (data.phase === "verify") {
    return (
      <s-page heading="Hello, world!" inlineSize="base">
        <s-section heading="Verify your app account">
          <s-stack direction="block" gap="base">
            <s-paragraph>
              Verify an email address to securely connect this Shopify user to
              one or more stores.
            </s-paragraph>
            {data.notice && <s-banner tone="success">{data.notice}</s-banner>}
            <Form method="post" action="/app/account">
              <input type="hidden" name="intent" value="request_magic_link" />
              <s-stack direction="block" gap="base">
                <s-email-field
                  label="Email address"
                  name="email"
                  value={data.suggestedEmail ?? ""}
                  autocomplete="email"
                  required
                />
                <s-button type="submit" variant="primary">
                  Send sign-in link
                </s-button>
              </s-stack>
            </Form>
          </s-stack>
        </s-section>
      </s-page>
    );
  }

  if (data.phase === "locked") {
    return (
      <s-page heading="Hello, world!" inlineSize="base">
        <s-banner heading="Store already connected" tone="critical">
          {data.shopDomain} belongs to another workspace. Contact the app
          account owner or support; the app never transfers a store silently.
        </s-banner>
      </s-page>
    );
  }

  if (data.phase === "workspace") {
    return (
      <s-page heading="Hello, world!" inlineSize="base">
        <s-section heading={`Connect ${data.currentStore.displayName}`}>
          <s-stack direction="block" gap="base">
            <s-paragraph>
              Create a workspace for this store, or attach it to a workspace you
              already own.
            </s-paragraph>
            {data.notice && <s-banner tone="success">{data.notice}</s-banner>}
            <Form method="post" action="/app/account">
              <input type="hidden" name="intent" value="create_workspace" />
              <s-stack direction="block" gap="base">
                <s-text-field
                  label="New workspace name"
                  name="name"
                  value={data.currentStore.displayName}
                  minLength={2}
                  maxLength={80}
                  required
                />
                <s-button type="submit" variant="primary">
                  Create workspace
                </s-button>
              </s-stack>
            </Form>
            {data.workspaces.length > 0 && (
              <Form method="post" action="/app/account">
                <input type="hidden" name="intent" value="attach_store" />
                <s-stack direction="block" gap="base">
                  <s-select label="Existing workspace" name="workspaceId">
                    {data.workspaces.map((workspace) => (
                      <s-option key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </s-option>
                    ))}
                  </s-select>
                  <s-button type="submit">Attach this store</s-button>
                </s-stack>
              </Form>
            )}
          </s-stack>
        </s-section>
      </s-page>
    );
  }

  const countLabel =
    data.counts.totalStores === 0
      ? "No connected stores"
      : data.counts.successfulStores === 0
        ? "Product count unavailable"
        : data.counts.isPartial
          ? `${data.counts.total.toLocaleString()} products across ${data.counts.successfulStores} of ${data.counts.totalStores} stores`
          : `${data.counts.total.toLocaleString()} products`;
  const failedResults = data.counts.results.filter((result) => !result.ok);
  const failedStoreNames = failedResults
    .map((result) => result.displayName)
    .join(", ");

  return (
    <s-page heading="Hello, world!" inlineSize="large">
      <s-button slot="primary-action" href="/app/stores">
        Manage stores
      </s-button>
      <s-section>
        <s-stack direction="block" gap="base">
          <s-paragraph>
            Welcome{data.firstName ? `, ${data.firstName}` : ""}. Live product
            totals for your connected Shopify stores are below.
          </s-paragraph>
          {data.notice && <s-banner tone="success">{data.notice}</s-banner>}
          {data.counts.isPartial && (
            <s-banner heading="Some stores could not be counted" tone="warning">
              {failedStoreNames} could not return an exact count. Retry or
              reconnect{" "}
              {failedResults.length === 1 ? "this store" : "these stores"}.
            </s-banner>
          )}
          {data.counts.totalStores === 0 && (
            <s-banner heading="No active stores" tone="info">
              Reinstall or connect a store from Manage stores to begin.
            </s-banner>
          )}
          {data.counts.totalStores > 0 &&
            !data.counts.isPartial &&
            data.counts.total === 0 && (
              <s-banner heading="No products yet" tone="info">
                The selected store view currently contains zero products.
              </s-banner>
            )}
          <Form method="get">
            <s-grid
              gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))"
              gap="base"
            >
              <s-select label="Workspace" name="workspace">
                {data.workspaces.map((workspace) => (
                  <s-option
                    key={workspace.id}
                    value={workspace.id}
                    selected={workspace.id === data.workspace.id}
                  >
                    {workspace.name}
                  </s-option>
                ))}
              </s-select>
              <s-select label="Store" name="store">
                <s-option value="all" selected={data.selectedStoreId === "all"}>
                  All stores
                </s-option>
                {data.workspace.stores
                  .filter((store) => store.status === "ACTIVE")
                  .map((store) => (
                    <s-option
                      key={store.id}
                      value={store.id}
                      selected={store.id === data.selectedStoreId}
                    >
                      {store.displayName}
                    </s-option>
                  ))}
              </s-select>
            </s-grid>
            <s-box paddingBlockStart="base">
              <s-button type="submit" {...(isLoading ? { loading: true } : {})}>
                Refresh count
              </s-button>
            </s-box>
          </Form>
          <s-box
            padding="large"
            background="subdued"
            border="base"
            borderRadius="large"
          >
            <s-stack direction="block" gap="small">
              <s-heading>Product total</s-heading>
              {isLoading ? (
                <s-stack direction="inline" gap="small" alignItems="center">
                  <s-spinner accessibilityLabel="Refreshing product count" />
                  <s-text>Refreshing live totals…</s-text>
                </s-stack>
              ) : (
                <s-text type="strong">{countLabel}</s-text>
              )}
              <s-paragraph color="subdued">
                Fetched live from Shopify. No product records are stored by this
                app.
              </s-paragraph>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>
      <s-section heading="Store breakdown">
        <s-table variant="auto">
          <s-table-header-row>
            <s-table-header listSlot="primary">Store</s-table-header>
            <s-table-header listSlot="labeled" format="numeric">
              Products
            </s-table-header>
            <s-table-header>Status</s-table-header>
          </s-table-header-row>
          <s-table-body>
            {data.counts.results.map((result) => (
              <s-table-row key={result.storeId}>
                <s-table-cell>{result.displayName}</s-table-cell>
                <s-table-cell>
                  {result.count === null ? "—" : result.count.toLocaleString()}
                </s-table-cell>
                <s-table-cell>
                  <s-badge tone={result.ok ? "success" : "critical"}>
                    {result.ok ? "Connected" : "Needs attention"}
                  </s-badge>
                </s-table-cell>
              </s-table-row>
            ))}
          </s-table-body>
        </s-table>
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) =>
  boundary.headers(headersArgs);
