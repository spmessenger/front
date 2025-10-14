import React from "react";
import { Layout, Flex } from "antd";
import { Content } from "antd/lib/layout/layout";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Layout style={{ height: "100vh" }}>
      <Content style={{ height: "100%", margin: "auto", paddingTop: "200px" }}>{children}</Content>
    </Layout>
  );
}
