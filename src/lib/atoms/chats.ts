import { atom } from "jotai";
import type { ChatType } from "@/lib/types";

export const chatsAtom = atom<ChatType[]>([]);
export const selectedChatIdAtom = atom<number | null>(null);