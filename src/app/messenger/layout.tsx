import React from "react";
import { Layout, Flex } from "antd";
import { Content, Header, Footer } from "antd/lib/layout/layout";
import Sider from "antd/lib/layout/Sider";

export default function MessengerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Flex style={{ height: "100vh" }}>{children}</Flex>;
}
