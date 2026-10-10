import prisma from "../db.server";

const SHOP_IDENTITY_QUERY = `#graphql
  query ShopIdentity {
    shop {
      id
      name
    }
  }
`;

export type ShopifyIdentity = {
  shopDomain: string;
  shopifyUserId: string;
  firstName: string | null;
  email: string | null;
};

type ShopifySession = {
  shop: string;
  scope?: string | null;
  userId?: bigint | number | string | null;
  firstName?: string | null;
  email?: string | null;
  emailVerified?: boolean | null;
  onlineAccessInfo?: {
    associated_user?: {
      id?: bigint | number | string;
      first_name?: string | null;
      email?: string | null;
      email_verified?: boolean;
    };
  } | null;
};

type AdminClient = {
  graphql: (query: string) => Promise<Response>;
};

export function identityFromSession(session: ShopifySession): ShopifyIdentity {
  const associatedUser = session.onlineAccessInfo?.associated_user;
  const userId = associatedUser?.id ?? session.userId;

  if (!userId) {
    throw new Response("A Shopify user session is required", { status: 403 });
  }

  return {
    shopDomain: session.shop.toLowerCase(),
    shopifyUserId: String(userId),
    firstName: associatedUser?.first_name ?? session.firstName ?? null,
    email:
      associatedUser?.email_verified === true
        ? (associatedUser.email ?? null)
        : session.emailVerified
          ? (session.email ?? null)
          : null,
  };
}

export async function ensureStoreConnection(
  admin: AdminClient,
  session: ShopifySession,
) {
  const response = await admin.graphql(SHOP_IDENTITY_QUERY);
  const payload = (await response.json()) as {
    data?: { shop?: { id?: string; name?: string } };
    errors?: unknown[];
  };
  const shop = payload.data?.shop;

  if (!shop?.id || !shop.name || payload.errors?.length) {
    throw new Response("Unable to read the current Shopify store", {
      status: 502,
    });
  }

  return prisma.storeConnection.upsert({
    where: { shopDomain: session.shop.toLowerCase() },
    create: {
      shopId: shop.id,
      shopDomain: session.shop.toLowerCase(),
      displayName: shop.name,
      scopes: session.scope,
      status: "ACTIVE",
    },
    update: {
      shopId: shop.id,
      displayName: shop.name,
      scopes: session.scope,
      status: "ACTIVE",
      disconnectedAt: null,
    },
  });
}

export async function findCurrentPrincipal(identity: ShopifyIdentity) {
  return prisma.shopifyPrincipal.findUnique({
    where: {
      shopDomain_shopifyUserId: {
        shopDomain: identity.shopDomain,
        shopifyUserId: identity.shopifyUserId,
      },
    },
    include: {
      appUser: {
        include: {
          memberships: {
            where: { role: "OWNER" },
            include: {
              workspace: {
                include: {
                  stores: { orderBy: { displayName: "asc" } },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
}
