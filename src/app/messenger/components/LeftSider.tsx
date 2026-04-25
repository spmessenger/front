"use client";

import React from "react";
import { Content, Header } from "antd/lib/layout/layout";
import Sider from "antd/lib/layout/Sider";
import ChatGroupsList from "./ChatGroupsList";
import ControlPanel from "./ControlPanel";

type LeftSiderProps = {
  messengerTheme: React.ComponentProps<typeof ControlPanel>["messengerTheme"];
  groups: React.ComponentProps<typeof ChatGroupsList>["groups"];
  selectedGroupId: React.ComponentProps<typeof ChatGroupsList>["selectedGroupId"];
  onSelectGroup?: React.ComponentProps<typeof ChatGroupsList>["onSelectGroup"];
  onOpenGroupSettings?: React.ComponentProps<typeof ChatGroupsList>["onOpenGroupSettings"];
};

export default function LeftSider({
  messengerTheme,
  groups,
  selectedGroupId,
  onSelectGroup,
  onOpenGroupSettings,
}: LeftSiderProps) {
  return (
    <Sider
      width="5%"
      style={{
        background: "var(--mess-sidebar-left)",
        border: "3px solid var(--line)",
        borderRight: 0,
        borderRadius: "10px 0 0 10px",
        overflow: "hidden",
        height: "100%",
        minHeight: 0,
      }}
    >
      <Header
        style={{
          background: "var(--mess-sidebar-mid)",
          padding: "0",
          borderBottom: "3px solid var(--line)",
        }}
      >
        <ControlPanel messengerTheme={messengerTheme} />
      </Header>
      <Content style={{ overflowY: "auto", minHeight: 0 }}>
        <ChatGroupsList
          groups={groups}
          selectedGroupId={selectedGroupId}
          onSelectGroup={onSelectGroup}
          onOpenGroupSettings={onOpenGroupSettings}
        />
      </Content>
    </Sider>
  );
}
