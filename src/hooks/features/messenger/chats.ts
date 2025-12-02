import React from "react";
import MessengerApi from "@/lib/api/messenger";
import { chatsAtom, selectedChatIdAtom } from "@/lib/atoms";
import { useAtomValue, useSetAtom } from "jotai";
import type { ChatType } from "@/lib/types";

export function useChats(): ChatType[] {
  const chats = useAtomValue(chatsAtom);
  const setChats = useSetAtom(chatsAtom);

  React.useEffect(() => {
    // TODO: should be moved to a container-component
    MessengerApi.getChats().then((res) => {
      setChats(res.data);
    });
  }, []);
  return chats;
}

export function useSelectedChat(): ChatType | undefined {
  const selectedChatId = useAtomValue(selectedChatIdAtom);
  const chats = useChats();
  return chats.find((chat) => chat.id === selectedChatId);
}
