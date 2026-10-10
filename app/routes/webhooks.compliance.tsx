import type { ActionFunctionArgs } from "react-router";

import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  if (topic === "CUSTOMERS_DATA_REQUEST" || topic === "CUSTOMERS_REDACT") {
    return new Response(null, { status: 200 });
  }

  if (topic !== "SHOP_REDACT") {
    return new Response("Unsupported compliance topic", { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    const connection = await tx.storeConnection.findUnique({
      where: { shopDomain: shop },
      select: { workspaceId: true },
    });
    const principals = await tx.shopifyPrincipal.findMany({
      where: { shopDomain: shop },
      select: { appUserId: true },
    });

    await tx.magicLink.deleteMany({ where: { shopDomain: shop } });
    await tx.shopifyPrincipal.deleteMany({ where: { shopDomain: shop } });
    await tx.session.deleteMany({ where: { shop } });
    await tx.storeConnection.deleteMany({ where: { shopDomain: shop } });

    if (connection?.workspaceId) {
      const remainingStores = await tx.storeConnection.count({
        where: { workspaceId: connection.workspaceId },
      });
      if (remainingStores === 0) {
        await tx.workspace.delete({ where: { id: connection.workspaceId } });
      }
    }

    for (const { appUserId } of principals) {
      const [principalCount, membershipCount] = await Promise.all([
        tx.shopifyPrincipal.count({ where: { appUserId } }),
        tx.membership.count({ where: { userId: appUserId } }),
      ]);
      if (principalCount === 0 && membershipCount === 0) {
        const user = await tx.appUser.findUnique({ where: { id: appUserId } });
        if (user) {
          await tx.magicLink.deleteMany({ where: { email: user.email } });
          await tx.appUser.delete({ where: { id: appUserId } });
        }
      }
    }
  });

  return new Response(null, { status: 200 });
};
