import { useLoaderData } from "react-router";

import { PublicPage } from "../components/PublicPage";
import prisma from "../db.server";

export const meta = () => [{ title: "Status | Hello Product Count" }];

export const loader = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json(
      { operational: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { operational: false },
      { headers: { "Cache-Control": "no-store" }, status: 503 },
    );
  }
};

export default function Status() {
  const { operational } = useLoaderData<typeof loader>();
  return (
    <PublicPage title="Service status">
      <p>
        {operational
          ? "The application and database are responding normally."
          : "The service is currently degraded. Please contact support if the issue persists."}
      </p>
    </PublicPage>
  );
}
