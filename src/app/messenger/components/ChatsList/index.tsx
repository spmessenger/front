import React from "react";
import { Flex } from "antd";
import ChatItem from "./ChatItem";
import { ChatType } from "@/lib/types";

interface ChatsListProps {
  chats: ChatType[];
  onClick?: (chat: ChatType) => void;
  onPinChat?: (chat: ChatType) => void;
  onUnpinChat?: (chat: ChatType) => void;
}

export default function ChatsList({ chats, onClick, onPinChat, onUnpinChat }: ChatsListProps) {
  return (
    <Flex vertical>
      {chats.map((chat) => (
        <ChatItem
          key={chat.id}
          chat={chat}
          onClick={onClick ?? (() => undefined)}
          onPinChat={onPinChat}
          onUnpinChat={onUnpinChat}
        />
      ))}
    </Flex>
  );
}
