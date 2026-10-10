import { unauthenticated } from "../shopify.server";

export const PRODUCT_COUNT_QUERY = `#graphql
  query ProductCount {
    productsCount(limit: null) {
      count
      precision
    }
  }
`;

export type ProductCount = {
  count: number;
  precision: string;
  exact: boolean;
};

export type StoreCountResult = {
  storeId: string;
  shopDomain: string;
  displayName: string;
  ok: boolean;
  count: number | null;
  precision: string | null;
  error: string | null;
};

export function parseProductCount(payload: unknown): ProductCount {
  const value = payload as {
    data?: { productsCount?: { count?: unknown; precision?: unknown } };
    errors?: unknown[];
  };
  const result = value.data?.productsCount;

  if (
    value.errors?.length ||
    typeof result?.count !== "number" ||
    typeof result.precision !== "string"
  ) {
    throw new Error("Shopify returned an invalid product count response");
  }

  return {
    count: result.count,
    precision: result.precision,
    exact: result.precision === "EXACT",
  };
}

export async function countProductsForShop(shopDomain: string) {
  const { admin } = await unauthenticated.admin(shopDomain);
  const response = await admin.graphql(PRODUCT_COUNT_QUERY);
  if (!response.ok) {
    throw new Error(`Shopify returned HTTP ${response.status}`);
  }
  return parseProductCount(await response.json());
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
) {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await mapper(values[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, worker),
  );
  return results;
}

export async function aggregateProductCounts(
  stores: Array<{ id: string; shopDomain: string; displayName: string }>,
  getCount: (
    shopDomain: string,
  ) => Promise<ProductCount> = countProductsForShop,
) {
  const results = await mapWithConcurrency(stores, 5, async (store) => {
    try {
      const result = await getCount(store.shopDomain);
      if (!result.exact) {
        throw new Error(`Shopify returned ${result.precision} precision`);
      }
      return {
        storeId: store.id,
        shopDomain: store.shopDomain,
        displayName: store.displayName,
        ok: true,
        count: result.count,
        precision: result.precision,
        error: null,
      } satisfies StoreCountResult;
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          event: "product_count_failed",
          storeId: store.id,
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      );
      return {
        storeId: store.id,
        shopDomain: store.shopDomain,
        displayName: store.displayName,
        ok: false,
        count: null,
        precision: null,
        error: "Reconnect this store or try again.",
      } satisfies StoreCountResult;
    }
  });

  const successful = results.filter(
    (result) => result.ok && result.count !== null,
  );

  return {
    total: successful.reduce((sum, result) => sum + (result.count ?? 0), 0),
    successfulStores: successful.length,
    totalStores: stores.length,
    isPartial: successful.length !== stores.length,
    isExact: successful.every((result) => result.precision === "EXACT"),
    results,
  };
}
