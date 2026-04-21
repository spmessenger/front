import React from "react";
import { Flex } from "antd";

export default function MessengerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Flex
      style={{
        height: "100svh",
        padding: "16px",
        boxSizing: "border-box",
        overflow: "hidden",
        alignItems: "stretch",
        minHeight: 0,
      }}
    >
      {children}
    </Flex>
  );
}
