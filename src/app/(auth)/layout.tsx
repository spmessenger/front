import React from "react";
import { Layout } from "antd";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Layout style={{ height: "100vh" }}>
      <div style={{ height: "100%", margin: "auto", paddingTop: "200px" }}>{children}</div>
    </Layout>
  );
}
