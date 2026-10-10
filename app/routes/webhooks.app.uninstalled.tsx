import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.info(
    JSON.stringify({ level: "info", event: "shopify_webhook", topic }),
  );

  await db.$transaction([
    db.session.deleteMany({ where: { shop } }),
    db.storeConnection.updateMany({
      where: { shopDomain: shop },
      data: { status: "DISCONNECTED", disconnectedAt: new Date() },
    }),
  ]);

  return new Response();
};
