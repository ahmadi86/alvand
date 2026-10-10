import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";

import { authenticate } from "../shopify.server";
import {
  ensureStoreConnection,
  findCurrentPrincipal,
  identityFromSession,
} from "../services/identity.server";
import { requestMagicLink } from "../services/magic-link.server";
import {
  attachStoreToWorkspace,
  createWorkspaceForStore,
  deleteOwnerAccount,
} from "../services/workspace.server";

function appRedirect(notice: string) {
  return redirect(`/app?notice=${encodeURIComponent(notice)}`);
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const identity = identityFromSession(session);
  const store = await ensureStoreConnection(admin, session);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "request_magic_link") {
    const developmentLink = await requestMagicLink(
      identity,
      String(formData.get("email") ?? ""),
    );
    const notice = developmentLink
      ? `Development sign-in link: ${developmentLink}`
      : "Check your email for a sign-in link.";
    return appRedirect(notice);
  }

  const principal = await findCurrentPrincipal(identity);
  if (!principal) {
    throw new Response("Verify your email before managing workspaces", {
      status: 403,
    });
  }

  if (intent === "create_workspace") {
    await createWorkspaceForStore({
      userId: principal.appUserId,
      storeId: store.id,
      name: String(formData.get("name") ?? ""),
    });
    return appRedirect("Workspace created.");
  }

  if (intent === "attach_store") {
    await attachStoreToWorkspace({
      userId: principal.appUserId,
      storeId: store.id,
      workspaceId: String(formData.get("workspaceId") ?? ""),
    });
    return appRedirect("Store connected to the workspace.");
  }

  if (intent === "delete_account") {
    if (formData.get("confirm") !== "yes") {
      throw new Response("Confirm account deletion", { status: 400 });
    }
    await deleteOwnerAccount(principal.appUserId);
    return appRedirect("Account deleted. Verify an email to start again.");
  }

  throw new Response("Unknown action", { status: 400 });
};

export const loader = () => redirect("/app");
