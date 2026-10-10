export const loader = () =>
  Response.json(
    { status: "ok", service: "hello-product-count" },
    { headers: { "Cache-Control": "no-store" } },
  );
