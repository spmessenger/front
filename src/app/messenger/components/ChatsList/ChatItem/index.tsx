import React from "react";
import ListItem, { Meta } from "antd/lib/list/Item";
import type { ChatType } from "./types";

interface ChatItemProps {
  chat: ChatType;
  onClick: () => void;
}

export default function ChatItemContainer({ chat }: ChatItemProps) {
  const onClick = () => {
    console.log("Clicked", chat.id);
  };
  return <ChatItem chat={chat} onClick={onClick} />;
}

function PrivateChatItem({ chat }: ChatItemProps) {
  return (
    <ListItem style={{ height: "68px" }}>
      <Meta
        avatar={<div>Avatar</div>}
        title={"Избранное"}
        description={chat.type}
      />
    </ListItem>
  );
}

function GeneralChatItem({ chat }: ChatItemProps) {
  return (
    <ListItem style={{ height: "68px" }}>
      <Meta
        avatar={<div>Avatar</div>}
        title={chat.title}
        description={chat.type}
      />
    </ListItem>
  );
}

function Hoverable({ children, onClick }: { children: React.ReactNode, onClick: () => void }) {
  return <div className="hoverable" onClick={onClick}>{children}</div>;
}

function ChatItem(props: ChatItemProps) {
  let ChatI;

  switch (props.chat.type) {
    case "private":
      ChatI = PrivateChatItem;
      break;
    default:
      ChatI = GeneralChatItem;
  }
  return (
    <Hoverable onClick={props.onClick}>
      <ChatI {...props} />
    </Hoverable>
  );
}
