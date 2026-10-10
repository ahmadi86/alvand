import { describe, expect, it, vi } from "vitest";

vi.mock("../shopify.server", () => ({
  unauthenticated: { admin: vi.fn() },
}));

import {
  aggregateProductCounts,
  parseProductCount,
} from "./product-count.server";

describe("parseProductCount", () => {
  it("accepts an exact count above Shopify's default 10,000 limit", () => {
    expect(
      parseProductCount({
        data: { productsCount: { count: 25_123, precision: "EXACT" } },
      }),
    ).toEqual({ count: 25_123, precision: "EXACT", exact: true });
  });

  it("rejects GraphQL errors and malformed responses", () => {
    expect(() =>
      parseProductCount({ errors: [{ message: "Access denied" }] }),
    ).toThrow("invalid product count response");
  });

  it("preserves Shopify precision so callers can reject estimates", () => {
    expect(
      parseProductCount({
        data: { productsCount: { count: 10_000, precision: "AT_LEAST" } },
      }),
    ).toEqual({ count: 10_000, precision: "AT_LEAST", exact: false });
  });
});

describe("aggregateProductCounts", () => {
  const stores = [
    { id: "one", shopDomain: "one.myshopify.com", displayName: "One" },
    { id: "two", shopDomain: "two.myshopify.com", displayName: "Two" },
  ];

  it("sums exact counts across stores", async () => {
    const result = await aggregateProductCounts(stores, async (shop) => ({
      count: shop.startsWith("one") ? 3 : 7,
      precision: "EXACT",
      exact: true,
    }));

    expect(result).toMatchObject({
      total: 10,
      successfulStores: 2,
      totalStores: 2,
      isPartial: false,
      isExact: true,
    });
  });

  it("returns an explicitly partial total when a store fails", async () => {
    const result = await aggregateProductCounts(stores, async (shop) => {
      if (shop.startsWith("two")) throw new Error("offline");
      return { count: 3, precision: "EXACT", exact: true };
    });

    expect(result).toMatchObject({
      total: 3,
      successfulStores: 1,
      totalStores: 2,
      isPartial: true,
    });
    expect(result.results[1]).toMatchObject({ ok: false, count: null });
  });

  it("does not include an estimated count in an exact aggregate", async () => {
    const result = await aggregateProductCounts(stores, async (shop) =>
      shop.startsWith("one")
        ? { count: 3, precision: "EXACT", exact: true }
        : { count: 10_000, precision: "AT_LEAST", exact: false },
    );

    expect(result).toMatchObject({
      total: 3,
      successfulStores: 1,
      totalStores: 2,
      isPartial: true,
      isExact: true,
    });
    expect(result.results[1]).toMatchObject({ ok: false, count: null });
  });
});
