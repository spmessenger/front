"use client";
import { useChats } from "@/hooks/features/messenger/chats";

export default function Messenger() {
  const chats = useChats();
  console.log(chats);
  return (
    <div>
      {chats.map((chat, key) => (
        <div key={key}>{'asdf'}</div>
      ))}
    </div>
  );
}
