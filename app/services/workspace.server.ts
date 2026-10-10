import prisma from "../db.server";

export async function createWorkspaceForStore(input: {
  userId: string;
  storeId: string;
  name: string;
}) {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) {
    throw new Response("Workspace names must be 2 to 80 characters", {
      status: 400,
    });
  }

  return prisma.$transaction(async (tx) => {
    const store = await tx.storeConnection.findUnique({
      where: { id: input.storeId },
    });
    if (!store || store.workspaceId) {
      throw new Response("This store is already connected to a workspace", {
        status: 409,
      });
    }

    return tx.workspace.create({
      data: {
        name,
        memberships: {
          create: { userId: input.userId, role: "OWNER" },
        },
        stores: { connect: { id: input.storeId } },
      },
    });
  });
}

export async function attachStoreToWorkspace(input: {
  userId: string;
  storeId: string;
  workspaceId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const membership = await tx.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: input.userId,
          workspaceId: input.workspaceId,
        },
      },
    });
    if (!membership || membership.role !== "OWNER") {
      throw new Response("You do not own that workspace", { status: 403 });
    }

    const result = await tx.storeConnection.updateMany({
      where: { id: input.storeId, workspaceId: null },
      data: { workspaceId: input.workspaceId },
    });
    if (result.count !== 1) {
      throw new Response("This store is already connected to a workspace", {
        status: 409,
      });
    }
  });
}

export async function deleteOwnerAccount(userId: string) {
  await prisma.$transaction(async (tx) => {
    const user = await tx.appUser.findUniqueOrThrow({ where: { id: userId } });
    const memberships = await tx.membership.findMany({
      where: { userId, role: "OWNER" },
      select: { workspaceId: true },
    });
    const workspaceIds = memberships.map((item) => item.workspaceId);

    await tx.storeConnection.updateMany({
      where: { workspaceId: { in: workspaceIds } },
      data: { workspaceId: null },
    });
    await tx.magicLink.deleteMany({ where: { email: user.email } });
    await tx.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
    await tx.appUser.delete({ where: { id: userId } });
  });
}
