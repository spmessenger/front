import { atom } from "jotai";
import type { ChatMessageType, ChatType } from "@/lib/types";

export const chatsAtom = atom<ChatType[]>([]);
export const selectedChatIdAtom = atom<number | null>(null);
export const chatMessagesAtom = atom<Record<number, ChatMessageType[]>>({});
