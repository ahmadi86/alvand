import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);
  console.info(
    JSON.stringify({ level: "info", event: "shopify_webhook", topic }),
  );

  const current = payload.current as string[];
  await db.$transaction([
    ...(session
      ? [
          db.session.update({
            where: { id: session.id },
            data: { scope: current.join(",") },
          }),
        ]
      : []),
    db.storeConnection.updateMany({
      where: { shopDomain: shop },
      data: { scopes: current.join(",") },
    }),
  ]);
  return new Response();
};
