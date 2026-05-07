import { create } from "zustand";
import type { SetStateAction } from "react";
import type {
  ChatFolderType,
  ChatMessageType,
  ChatType,
  ContactType,
  ExpenseOverviewType,
  ExpensePaymentType,
  ExpenseType,
  WatchRoomChatMessageType,
  WatchRoomType,
} from "@/lib/types";

const ALL_CHATS_GROUP_ID = -1;
type MessengerThemeState = "retro" | "mono";
type YouTubeAccessMode = "direct" | "assisted";
type WatchRoomReactionViewState = {
  id: string;
  emoji: string;
  x_percent: number;
  y_percent: number;
};

type MessengerStore = {
  chats: ChatType[];
  selectedChat: ChatType | undefined;
  selectedChatId: number | null;
  chatMessages: Record<number, ChatMessageType[]>;
  chatFolders: ChatFolderType[];
  selectedFolderId: number;
  isChatsSyncing: boolean;
  isChatGroupsSyncing: boolean;
  hasChatsSyncedOnce: boolean;
  hasChatGroupsSyncedOnce: boolean;
  messengerTheme: MessengerThemeState;
  isSocketConnected: boolean;
  socket: WebSocket | null;
  isMessagesNearBottom: boolean;
  isExpenseModalOpen: boolean;
  isExpenseSubmitting: boolean;
  isExpenseMarkingPaid: boolean;
  expenseParticipants: ContactType[];
  expenseOverview: ExpenseOverviewType | null;
  isExpensesViewOpen: boolean;
  isExpensesViewLoading: boolean;
  expensesPanelWidth: number;
  chatExpenses: ExpenseType[];
  expensePayments: ExpensePaymentType[];
  youtubePreviewVideoId: string | null;
  isYouTubeApiReady: boolean;
  isYouTubeApiBlocked: boolean;
  isYouTubePlayerReady: boolean;
  syncedToUserId: number | null;
  isWatchRoomSyncing: boolean;
  youtubeAccessMode: YouTubeAccessMode;
  youtubeAssistEnabled: boolean;
  canEnableYouTubeAssist: boolean;
  activeWatchRoom: WatchRoomType | null;
  watchRoomChatMessagesByRoomId: Record<string, WatchRoomChatMessageType[]>;
  watchRoomReactionsByRoomId: Record<string, WatchRoomReactionViewState[]>;
  watchRoomPlaybackSeconds: number;
  watchRoomsByKey: Record<string, WatchRoomType>;
  isWatchRoomInviteModalOpen: boolean;
  watchRoomInviteUserId: number | null;
  setChats: (value: SetStateAction<ChatType[]>) => void;
  setSelectedChat: (chat: ChatType | null | undefined) => void;
  setSelectedChatId: (chatId: number | null) => void;
  setChatMessages: (value: SetStateAction<Record<number, ChatMessageType[]>>) => void;
  setChatFolders: (value: SetStateAction<ChatFolderType[]>) => void;
  setSelectedFolderId: (value: SetStateAction<number>) => void;
  setIsChatsSyncing: (value: SetStateAction<boolean>) => void;
  setIsChatGroupsSyncing: (value: SetStateAction<boolean>) => void;
  setHasChatsSyncedOnce: (value: SetStateAction<boolean>) => void;
  setHasChatGroupsSyncedOnce: (value: SetStateAction<boolean>) => void;
  setMessengerTheme: (value: SetStateAction<MessengerThemeState>) => void;
  setIsSocketConnected: (value: SetStateAction<boolean>) => void;
  setSocket: (value: SetStateAction<WebSocket | null>) => void;
  setIsMessagesNearBottom: (value: SetStateAction<boolean>) => void;
  setIsExpenseModalOpen: (value: SetStateAction<boolean>) => void;
  setIsExpenseSubmitting: (value: SetStateAction<boolean>) => void;
  setIsExpenseMarkingPaid: (value: SetStateAction<boolean>) => void;
  setExpenseParticipants: (value: SetStateAction<ContactType[]>) => void;
  setExpenseOverview: (value: SetStateAction<ExpenseOverviewType | null>) => void;
  setIsExpensesViewOpen: (value: SetStateAction<boolean>) => void;
  setIsExpensesViewLoading: (value: SetStateAction<boolean>) => void;
  setExpensesPanelWidth: (value: SetStateAction<number>) => void;
  setChatExpenses: (value: SetStateAction<ExpenseType[]>) => void;
  setExpensePayments: (value: SetStateAction<ExpensePaymentType[]>) => void;
  setYoutubePreviewVideoId: (value: SetStateAction<string | null>) => void;
  setIsYouTubeApiReady: (value: SetStateAction<boolean>) => void;
  setIsYouTubeApiBlocked: (value: SetStateAction<boolean>) => void;
  setIsYouTubePlayerReady: (value: SetStateAction<boolean>) => void;
  setSyncedToUserId: (value: SetStateAction<number | null>) => void;
  setIsWatchRoomSyncing: (value: SetStateAction<boolean>) => void;
  setYoutubeAccessMode: (value: SetStateAction<YouTubeAccessMode>) => void;
  setYoutubeAssistEnabled: (value: SetStateAction<boolean>) => void;
  setCanEnableYouTubeAssist: (value: SetStateAction<boolean>) => void;
  setActiveWatchRoom: (value: SetStateAction<WatchRoomType | null>) => void;
  setWatchRoomChatMessagesByRoomId: (
    value: SetStateAction<Record<string, WatchRoomChatMessageType[]>>,
  ) => void;
  setWatchRoomReactionsByRoomId: (
    value: SetStateAction<Record<string, WatchRoomReactionViewState[]>>,
  ) => void;
  setWatchRoomPlaybackSeconds: (value: SetStateAction<number>) => void;
  setWatchRoomsByKey: (value: SetStateAction<Record<string, WatchRoomType>>) => void;
  setIsWatchRoomInviteModalOpen: (value: SetStateAction<boolean>) => void;
  setWatchRoomInviteUserId: (value: SetStateAction<number | null>) => void;
};

function resolveSetStateAction<T>(current: T, value: SetStateAction<T>): T {
  return typeof value === "function" ? (value as (prev: T) => T)(current) : value;
}

export const useMessengerStore = create<MessengerStore>((set) => ({
  chats: [],
  selectedChat: undefined,
  selectedChatId: null,
  chatMessages: {},
  chatFolders: [],
  selectedFolderId: ALL_CHATS_GROUP_ID,
  isChatsSyncing: false,
  isChatGroupsSyncing: false,
  hasChatsSyncedOnce: false,
  hasChatGroupsSyncedOnce: false,
  messengerTheme: "mono",
  isSocketConnected: false,
  socket: null,
  isMessagesNearBottom: true,
  isExpenseModalOpen: false,
  isExpenseSubmitting: false,
  isExpenseMarkingPaid: false,
  expenseParticipants: [],
  expenseOverview: null,
  isExpensesViewOpen: false,
  isExpensesViewLoading: false,
  expensesPanelWidth: 360,
  chatExpenses: [],
  expensePayments: [],
  youtubePreviewVideoId: null,
  isYouTubeApiReady: false,
  isYouTubeApiBlocked: false,
  isYouTubePlayerReady: false,
  syncedToUserId: null,
  isWatchRoomSyncing: false,
  youtubeAccessMode: "direct",
  youtubeAssistEnabled: false,
  canEnableYouTubeAssist: false,
  activeWatchRoom: null,
  watchRoomChatMessagesByRoomId: {},
  watchRoomReactionsByRoomId: {},
  watchRoomPlaybackSeconds: 0,
  watchRoomsByKey: {},
  isWatchRoomInviteModalOpen: false,
  watchRoomInviteUserId: null,
  setChats: (value) =>
    set((state) => ({
      chats: resolveSetStateAction(state.chats, value),
    })),
  setSelectedChat: (chat) =>
    set(() => ({
      selectedChat: chat ?? undefined,
      selectedChatId: chat?.id ?? null,
    })),
  setSelectedChatId: (chatId) =>
    set((state) => ({
      selectedChat:
        chatId === null
          ? undefined
          : state.chats.find((chat) => chat.id === chatId),
      selectedChatId: chatId,
    })),
  setChatMessages: (value) =>
    set((state) => ({
      chatMessages: resolveSetStateAction(state.chatMessages, value),
    })),
  setChatFolders: (value) =>
    set((state) => ({
      chatFolders: resolveSetStateAction(state.chatFolders, value),
    })),
  setSelectedFolderId: (value) =>
    set((state) => ({
      selectedFolderId: resolveSetStateAction(state.selectedFolderId, value),
    })),
  setIsChatsSyncing: (value) =>
    set((state) => ({
      isChatsSyncing: resolveSetStateAction(state.isChatsSyncing, value),
    })),
  setIsChatGroupsSyncing: (value) =>
    set((state) => ({
      isChatGroupsSyncing: resolveSetStateAction(state.isChatGroupsSyncing, value),
    })),
  setHasChatsSyncedOnce: (value) =>
    set((state) => ({
      hasChatsSyncedOnce: resolveSetStateAction(state.hasChatsSyncedOnce, value),
    })),
  setHasChatGroupsSyncedOnce: (value) =>
    set((state) => ({
      hasChatGroupsSyncedOnce: resolveSetStateAction(state.hasChatGroupsSyncedOnce, value),
    })),
  setMessengerTheme: (value) =>
    set((state) => ({
      messengerTheme: resolveSetStateAction(state.messengerTheme, value),
    })),
  setIsSocketConnected: (value) =>
    set((state) => ({
      isSocketConnected: resolveSetStateAction(state.isSocketConnected, value),
    })),
  setSocket: (value) =>
    set((state) => ({
      socket: resolveSetStateAction(state.socket, value),
    })),
  setIsMessagesNearBottom: (value) =>
    set((state) => ({
      isMessagesNearBottom: resolveSetStateAction(state.isMessagesNearBottom, value),
    })),
  setIsExpenseModalOpen: (value) =>
    set((state) => ({
      isExpenseModalOpen: resolveSetStateAction(state.isExpenseModalOpen, value),
    })),
  setIsExpenseSubmitting: (value) =>
    set((state) => ({
      isExpenseSubmitting: resolveSetStateAction(state.isExpenseSubmitting, value),
    })),
  setIsExpenseMarkingPaid: (value) =>
    set((state) => ({
      isExpenseMarkingPaid: resolveSetStateAction(state.isExpenseMarkingPaid, value),
    })),
  setExpenseParticipants: (value) =>
    set((state) => ({
      expenseParticipants: resolveSetStateAction(state.expenseParticipants, value),
    })),
  setExpenseOverview: (value) =>
    set((state) => ({
      expenseOverview: resolveSetStateAction(state.expenseOverview, value),
    })),
  setIsExpensesViewOpen: (value) =>
    set((state) => ({
      isExpensesViewOpen: resolveSetStateAction(state.isExpensesViewOpen, value),
    })),
  setIsExpensesViewLoading: (value) =>
    set((state) => ({
      isExpensesViewLoading: resolveSetStateAction(state.isExpensesViewLoading, value),
    })),
  setExpensesPanelWidth: (value) =>
    set((state) => ({
      expensesPanelWidth: resolveSetStateAction(state.expensesPanelWidth, value),
    })),
  setChatExpenses: (value) =>
    set((state) => ({
      chatExpenses: resolveSetStateAction(state.chatExpenses, value),
    })),
  setExpensePayments: (value) =>
    set((state) => ({
      expensePayments: resolveSetStateAction(state.expensePayments, value),
    })),
  setYoutubePreviewVideoId: (value) =>
    set((state) => ({
      youtubePreviewVideoId: resolveSetStateAction(state.youtubePreviewVideoId, value),
    })),
  setIsYouTubeApiReady: (value) =>
    set((state) => ({
      isYouTubeApiReady: resolveSetStateAction(state.isYouTubeApiReady, value),
    })),
  setIsYouTubeApiBlocked: (value) =>
    set((state) => ({
      isYouTubeApiBlocked: resolveSetStateAction(state.isYouTubeApiBlocked, value),
    })),
  setIsYouTubePlayerReady: (value) =>
    set((state) => ({
      isYouTubePlayerReady: resolveSetStateAction(state.isYouTubePlayerReady, value),
    })),
  setSyncedToUserId: (value) =>
    set((state) => ({
      syncedToUserId: resolveSetStateAction(state.syncedToUserId, value),
    })),
  setIsWatchRoomSyncing: (value) =>
    set((state) => ({
      isWatchRoomSyncing: resolveSetStateAction(state.isWatchRoomSyncing, value),
    })),
  setYoutubeAccessMode: (value) =>
    set((state) => ({
      youtubeAccessMode: resolveSetStateAction(state.youtubeAccessMode, value),
    })),
  setYoutubeAssistEnabled: (value) =>
    set((state) => ({
      youtubeAssistEnabled: resolveSetStateAction(state.youtubeAssistEnabled, value),
    })),
  setCanEnableYouTubeAssist: (value) =>
    set((state) => ({
      canEnableYouTubeAssist: resolveSetStateAction(state.canEnableYouTubeAssist, value),
    })),
  setActiveWatchRoom: (value) =>
    set((state) => ({
      activeWatchRoom: resolveSetStateAction(state.activeWatchRoom, value),
    })),
  setWatchRoomChatMessagesByRoomId: (value) =>
    set((state) => ({
      watchRoomChatMessagesByRoomId: resolveSetStateAction(
        state.watchRoomChatMessagesByRoomId,
        value,
      ),
    })),
  setWatchRoomReactionsByRoomId: (value) =>
    set((state) => ({
      watchRoomReactionsByRoomId: resolveSetStateAction(
        state.watchRoomReactionsByRoomId,
        value,
      ),
    })),
  setWatchRoomPlaybackSeconds: (value) =>
    set((state) => ({
      watchRoomPlaybackSeconds: resolveSetStateAction(state.watchRoomPlaybackSeconds, value),
    })),
  setWatchRoomsByKey: (value) =>
    set((state) => ({
      watchRoomsByKey: resolveSetStateAction(state.watchRoomsByKey, value),
    })),
  setIsWatchRoomInviteModalOpen: (value) =>
    set((state) => ({
      isWatchRoomInviteModalOpen: resolveSetStateAction(state.isWatchRoomInviteModalOpen, value),
    })),
  setWatchRoomInviteUserId: (value) =>
    set((state) => ({
      watchRoomInviteUserId: resolveSetStateAction(state.watchRoomInviteUserId, value),
    })),
}));
