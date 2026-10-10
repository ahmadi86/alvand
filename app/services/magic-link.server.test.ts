import { describe, expect, it, vi } from "vitest";

vi.mock("../db.server", () => ({ default: {} }));
vi.mock("./mail.server", () => ({ sendMagicLinkEmail: vi.fn() }));

import {
  hashMagicToken,
  isMagicLinkUsable,
  isValidEmail,
  normalizeEmail,
} from "./magic-link.server";

describe("magic-link helpers", () => {
  it("normalizes email identities consistently", () => {
    expect(normalizeEmail("  Owner@Example.COM ")).toBe("owner@example.com");
  });

  it("validates basic email shape", () => {
    expect(isValidEmail("owner@example.com")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
  });

  it("hashes tokens without retaining the original secret", () => {
    const hash = hashMagicToken("secret-token");
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain("secret-token");
    expect(hashMagicToken("secret-token")).toBe(hash);
  });

  it("rejects expired and consumed links", () => {
    const now = new Date("2026-10-09T12:00:00Z");

    expect(
      isMagicLinkUsable(
        { consumedAt: null, expiresAt: new Date("2026-10-09T12:01:00Z") },
        now,
      ),
    ).toBe(true);
    expect(
      isMagicLinkUsable(
        { consumedAt: null, expiresAt: new Date("2026-10-09T12:00:00Z") },
        now,
      ),
    ).toBe(false);
    expect(
      isMagicLinkUsable(
        {
          consumedAt: new Date("2026-10-09T11:59:00Z"),
          expiresAt: new Date("2026-10-09T12:01:00Z"),
        },
        now,
      ),
    ).toBe(false);
  });
});
