"use client";

import React from "react";
import { Layout } from "antd";
import { Content, Header } from "antd/lib/layout/layout";
import Sider from "antd/lib/layout/Sider";
import ChatsList from "./ChatsList";
import SearchInput from "./SearchInput";

type ChatsListSiderProps = {
  chats: React.ComponentProps<typeof ChatsList>["chats"];
  onSelectChat: (chatId: number) => void;
  onPinChat: (chatId: number) => void | Promise<void>;
  onUnpinChat: (chatId: number) => void | Promise<void>;
};

export default function ChatsListSider({
  chats,
  onSelectChat,
  onPinChat,
  onUnpinChat,
}: ChatsListSiderProps) {
  return (
    <Sider
      width="25%"
      style={{
        background: "var(--mess-sidebar-mid)",
        border: "3px solid var(--line)",
        borderRight: 0,
        borderLeft: 0,
        overflow: "hidden",
        height: "100%",
        minHeight: 0,
      }}
    >
      <Layout style={{ height: "100%", minHeight: 0 }}>
        <Header
          style={{
            background: "var(--mess-sidebar-mid)",
            padding: "0 10px",
            borderBottom: "3px solid var(--line)",
          }}
        >
          <SearchInput />
        </Header>
        <Content
          style={{
            background: "var(--mess-shell-bg)",
            overflowY: "auto",
            minHeight: 0,
          }}
        >
          <ChatsList
            chats={chats}
            onClick={(chat) => onSelectChat(chat.id)}
            onPinChat={(chat) => {
              void onPinChat(chat.id);
            }}
            onUnpinChat={(chat) => {
              void onUnpinChat(chat.id);
            }}
          />
        </Content>
      </Layout>
    </Sider>
  );
}
