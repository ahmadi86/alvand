import type { ReactNode } from "react";

export function PublicPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main
      style={{
        color: "#202223",
        fontFamily: "Inter, sans-serif",
        lineHeight: 1.6,
        margin: "48px auto",
        maxWidth: 760,
        padding: "0 24px",
      }}
    >
      <h1>{title}</h1>
      {children}
      <hr style={{ border: 0, borderTop: "1px solid #ddd", marginTop: 40 }} />
      <p>
        <a href="/">Alvand</a>
      </p>
    </main>
  );
}
