import { chatsAtom, selectedChatIdAtom } from "@/lib/atoms";
import { useAtomValue, useSetAtom } from "jotai";
import type { ChatType } from "@/lib/types";

export function useChatsSetter(): (chats: ChatType[]) => void {
  return useSetAtom(chatsAtom);
}

export function useChats(): ChatType[] {
  return useAtomValue(chatsAtom);
}

export function useSelectedChatSetter(): (chatId: number | null) => void {
  return useSetAtom(selectedChatIdAtom);
}

export function useSelectedChat(): ChatType | undefined {
  const selectedChatId = useAtomValue(selectedChatIdAtom);
  const chats = useChats();
  return chats.find((chat) => chat.id === selectedChatId);
}
