import React from "react";
import { List } from "antd";
import { useChats } from "@/hooks/features/messenger/chats";
import ChatItem from "./ChatItem";

export default function ChatsList() {
  const chats = useChats();
  return (
    <List
      itemLayout="horizontal"
      dataSource={chats}
      renderItem={(item) => <ChatItem chat={item} />}
    />
  );
}
