import { createHash, randomBytes } from "node:crypto";

import prisma from "../db.server";
import { sendMagicLinkEmail } from "./mail.server";
import type { ShopifyIdentity } from "./identity.server";

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function hashMagicToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isMagicLinkUsable(
  link: { consumedAt: Date | null; expiresAt: Date },
  now = new Date(),
) {
  return link.consumedAt === null && link.expiresAt > now;
}

function appUrl() {
  const value = process.env.SHOPIFY_APP_URL;
  if (!value) throw new Error("SHOPIFY_APP_URL is required");
  return new URL(value);
}

export async function requestMagicLink(
  identity: ShopifyIdentity,
  requestedEmail: string,
) {
  const email = normalizeEmail(requestedEmail);
  if (!isValidEmail(email)) {
    throw new Response("Enter a valid email address", { status: 400 });
  }

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recentRequests = await prisma.magicLink.count({
    where: {
      createdAt: { gte: since },
      OR: [
        { email },
        {
          shopDomain: identity.shopDomain,
          shopifyUserId: identity.shopifyUserId,
        },
      ],
    },
  });
  if (recentRequests >= RATE_LIMIT_MAX) {
    throw new Response("Too many sign-in emails. Try again in 15 minutes.", {
      status: 429,
    });
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  await prisma.$transaction([
    prisma.magicLink.deleteMany({
      where: {
        shopDomain: identity.shopDomain,
        shopifyUserId: identity.shopifyUserId,
        consumedAt: null,
      },
    }),
    prisma.magicLink.create({
      data: {
        tokenHash: hashMagicToken(token),
        email,
        shopDomain: identity.shopDomain,
        shopifyUserId: identity.shopifyUserId,
        expiresAt,
      },
    }),
  ]);

  const verifyUrl = new URL("/magic/verify", appUrl());
  verifyUrl.searchParams.set("token", token);
  await sendMagicLinkEmail(email, verifyUrl.toString());

  return process.env.NODE_ENV === "production" ? null : verifyUrl.toString();
}

export async function inspectMagicLink(token: string) {
  if (!token) return { ok: false as const, reason: "missing" as const };

  const magicLink = await prisma.magicLink.findUnique({
    where: { tokenHash: hashMagicToken(token) },
    select: { consumedAt: true, expiresAt: true },
  });

  if (!magicLink || !isMagicLinkUsable(magicLink)) {
    return { ok: false as const, reason: "expired" as const };
  }

  return { ok: true as const };
}

export async function consumeMagicLink(token: string) {
  if (!token) return { ok: false as const, reason: "missing" as const };

  return prisma.$transaction(async (tx) => {
    const magicLink = await tx.magicLink.findUnique({
      where: { tokenHash: hashMagicToken(token) },
    });

    if (!magicLink || !isMagicLinkUsable(magicLink)) {
      return { ok: false as const, reason: "expired" as const };
    }

    const existingPrincipal = await tx.shopifyPrincipal.findUnique({
      where: {
        shopDomain_shopifyUserId: {
          shopDomain: magicLink.shopDomain,
          shopifyUserId: magicLink.shopifyUserId,
        },
      },
      include: { appUser: true },
    });

    if (
      existingPrincipal &&
      existingPrincipal.appUser.email !== magicLink.email
    ) {
      return { ok: false as const, reason: "conflict" as const };
    }

    const appUser = await tx.appUser.upsert({
      where: { email: magicLink.email },
      create: { email: magicLink.email, verifiedAt: new Date() },
      update: { verifiedAt: new Date() },
    });

    await tx.shopifyPrincipal.upsert({
      where: {
        shopDomain_shopifyUserId: {
          shopDomain: magicLink.shopDomain,
          shopifyUserId: magicLink.shopifyUserId,
        },
      },
      create: {
        shopDomain: magicLink.shopDomain,
        shopifyUserId: magicLink.shopifyUserId,
        appUserId: appUser.id,
      },
      update: {},
    });
    await tx.magicLink.update({
      where: { id: magicLink.id },
      data: { consumedAt: new Date() },
    });

    return {
      ok: true as const,
      shopDomain: magicLink.shopDomain,
      email: magicLink.email,
    };
  });
}
