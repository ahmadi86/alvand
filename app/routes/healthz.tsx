export const loader = () =>
  Response.json(
    { status: "ok", service: "alvand" },
    { headers: { "Cache-Control": "no-store" } },
  );
