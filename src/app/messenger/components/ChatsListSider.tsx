"use client";

import React from "react";
import { Layout, message } from "antd";
import { Content, Header } from "antd/lib/layout/layout";
import Sider from "antd/lib/layout/Sider";
import ChatsList from "./ChatsList";
import SearchInput from "./SearchInput";
import {
  useChatsByFolder,
  useSelectedChatSetter,
} from "@/hooks/features/messenger/chats";
import { ChatType } from "@/lib/types";
import MessengerApi from "@/lib/api/messenger";

export default function ChatsListSider() {
  const setSelectedChat = useSelectedChatSetter();
  const chats = useChatsByFolder();
  const handleSelectChat = (chat: ChatType) => setSelectedChat(chat);
  const handlePinChat = async (chat: ChatType) => {
    try {
      const response = await MessengerApi.pinChat(chat.id);
      if (!response.data) {
        message.error("Failed to pin chat.");
        return;
      }
      await refreshChats();
    } catch {
      message.error("Failed to pin chat.");
    }
  };
  const handleUnpinChat = async (chat: ChatType) => {
    try {
      const response = await MessengerApi.unpinChat(chat.id);
      if (!response.data) {
        message.error("Failed to unpin chat.");
        return;
      }
      await refreshChats();
    } catch {
      message.error("Failed to unpin chat."); 
    }
  };
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
            onClick={handleSelectChat}
            onPinChat={handlePinChat}
            onUnpinChat={handleUnpinChat}
          />
        </Content>
      </Layout>
    </Sider>
  );
}
