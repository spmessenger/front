"use client";
import { useChats } from "@/hooks/features/messenger/chats";

export default function Messenger() {
  const chats = useChats();
  return (
    <div>
      {chats.map((chat, key) => (
        <div key={key}>{chat.title}</div>
      ))}
    </div>
  );
}
