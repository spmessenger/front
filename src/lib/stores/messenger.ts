import { create } from "zustand";
import type { SetStateAction } from "react";
import type { ChatMessageType, ChatType } from "@/lib/types";

type MessengerStore = {
  chats: ChatType[];
  selectedChatId: number | null;
  chatMessages: Record<number, ChatMessageType[]>;
  setChats: (value: SetStateAction<ChatType[]>) => void;
  setSelectedChatId: (chatId: number | null) => void;
  setChatMessages: (value: SetStateAction<Record<number, ChatMessageType[]>>) => void;
};

function resolveSetStateAction<T>(current: T, value: SetStateAction<T>): T {
  return typeof value === "function" ? (value as (prev: T) => T)(current) : value;
}

export const useMessengerStore = create<MessengerStore>((set) => ({
  chats: [],
  selectedChatId: null,
  chatMessages: {},
  setChats: (value) =>
    set((state) => ({
      chats: resolveSetStateAction(state.chats, value),
    })),
  setSelectedChatId: (chatId) =>
    set(() => ({
      selectedChatId: chatId,
    })),
  setChatMessages: (value) =>
    set((state) => ({
      chatMessages: resolveSetStateAction(state.chatMessages, value),
    })),
}));
