import type { ChatMessageType, ChatType } from "@/lib/types";
import type { SetStateAction } from "react";
import { useMessengerStore } from "@/lib/stores/messenger";

export function useChatsSetter(): (chats: SetStateAction<ChatType[]>) => void {
  return useMessengerStore((state) => state.setChats);
}

export function useChats(): ChatType[] {
  return useMessengerStore((state) => state.chats);
}

export function useSelectedChatSetter(): (chatId: number | null) => void {
  return useMessengerStore((state) => state.setSelectedChatId);
}

export function useSelectedChat(): ChatType | undefined {
  const selectedChatId = useMessengerStore((state) => state.selectedChatId);
  const chats = useChats();
  return chats.find((chat) => chat.id === selectedChatId);
}

export function useChatMessages(chatId: number | null): ChatMessageType[] {
  const messages = useMessengerStore((state) => state.chatMessages);

  if (chatId === null) {
    return [];
  }

  return messages[chatId] ?? [];
}

export function useChatMessagesSetter(): (
  value: SetStateAction<Record<number, ChatMessageType[]>>,
) => void {
  return useMessengerStore((state) => state.setChatMessages);
}
