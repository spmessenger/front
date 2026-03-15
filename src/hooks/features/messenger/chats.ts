import { chatMessagesAtom, chatsAtom, selectedChatIdAtom } from "@/lib/atoms";
import { useAtomValue, useSetAtom } from "jotai";
import type { ChatMessageType, ChatType } from "@/lib/types";
import type { SetStateAction } from "react";

export function useChatsSetter(): (chats: SetStateAction<ChatType[]>) => void {
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

export function useChatMessages(chatId: number | null): ChatMessageType[] {
  const messages = useAtomValue(chatMessagesAtom);

  if (chatId === null) {
    return [];
  }

  return messages[chatId] ?? [];
}

export function useChatMessagesSetter(): (
  value: SetStateAction<Record<number, ChatMessageType[]>>,
) => void {
  return useSetAtom(chatMessagesAtom);
}
