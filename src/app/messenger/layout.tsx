import React from "react";
import { Flex } from "antd";

export default function MessengerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Flex style={{ height: "100vh" }}>{children}</Flex>;
}
