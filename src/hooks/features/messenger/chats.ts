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
import type { SetStateAction } from "react";
import { useMessengerStore } from "@/lib/stores/messenger";

export function useChatsSetter(): (chats: SetStateAction<ChatType[]>) => void {
  return useMessengerStore((state) => state.setChats);
}

export function useChats(): ChatType[] {
  return useMessengerStore((state) => state.chats);
}

export function useSelectedChatSetter(): (
  chat: ChatType | null | undefined,
) => void {
  return useMessengerStore((state) => state.setSelectedChat);
}

export function useSelectedChat(): ChatType | undefined {
  return useMessengerStore((state) => state.selectedChat);
}

export function useSelectedChatId(): number | null {
  return useMessengerStore((state) => state.selectedChatId);
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

export function useChatFolders(): ChatFolderType[] {
  return useMessengerStore((state) => state.chatFolders);
}

export function useChatFoldersSetter(): (
  value: SetStateAction<ChatFolderType[]>,
) => void {
  return useMessengerStore((state) => state.setChatFolders);
}

export function useSelectedFolderId(): number {
  return useMessengerStore((state) => state.selectedFolderId);
}

export function useSelectedFolderIdSetter(): (value: SetStateAction<number>) => void {
  return useMessengerStore((state) => state.setSelectedFolderId);
}

export function useIsChatsSyncing(): boolean {
  return useMessengerStore((state) => state.isChatsSyncing);
}

export function useIsChatsSyncingSetter(): (value: SetStateAction<boolean>) => void {
  return useMessengerStore((state) => state.setIsChatsSyncing);
}

export function useIsChatGroupsSyncing(): boolean {
  return useMessengerStore((state) => state.isChatGroupsSyncing);
}

export function useIsChatGroupsSyncingSetter(): (
  value: SetStateAction<boolean>,
) => void {
  return useMessengerStore((state) => state.setIsChatGroupsSyncing);
}

export function useHasChatsSyncedOnce(): boolean {
  return useMessengerStore((state) => state.hasChatsSyncedOnce);
}

export function useHasChatsSyncedOnceSetter(): (value: SetStateAction<boolean>) => void {
  return useMessengerStore((state) => state.setHasChatsSyncedOnce);
}

export function useHasChatGroupsSyncedOnce(): boolean {
  return useMessengerStore((state) => state.hasChatGroupsSyncedOnce);
}

export function useHasChatGroupsSyncedOnceSetter(): (
  value: SetStateAction<boolean>,
) => void {
  return useMessengerStore((state) => state.setHasChatGroupsSyncedOnce);
}

export function useMessengerTheme(): "retro" | "mono" {
  return useMessengerStore((state) => state.messengerTheme);
}

export function useMessengerThemeSetter(): (
  value: SetStateAction<"retro" | "mono">,
) => void {
  return useMessengerStore((state) => state.setMessengerTheme);
}

export function useIsSocketConnected(): boolean {
  return useMessengerStore((state) => state.isSocketConnected);
}

export function useIsSocketConnectedSetter(): (value: SetStateAction<boolean>) => void {
  return useMessengerStore((state) => state.setIsSocketConnected);
}

export function useSocket(): WebSocket | null {
  return useMessengerStore((state) => state.socket);
}

export function useSocketSetter(): (value: SetStateAction<WebSocket | null>) => void {
  return useMessengerStore((state) => state.setSocket);
}

export function useIsMessagesNearBottom(): boolean {
  return useMessengerStore((state) => state.isMessagesNearBottom);
}

export function useIsMessagesNearBottomSetter(): (value: SetStateAction<boolean>) => void {
  return useMessengerStore((state) => state.setIsMessagesNearBottom);
}

export function useIsExpenseModalOpen(): boolean {
  return useMessengerStore((state) => state.isExpenseModalOpen);
}

export function useIsExpenseModalOpenSetter(): (value: SetStateAction<boolean>) => void {
  return useMessengerStore((state) => state.setIsExpenseModalOpen);
}

export function useIsExpenseSubmitting(): boolean {
  return useMessengerStore((state) => state.isExpenseSubmitting);
}

export function useIsExpenseSubmittingSetter(): (value: SetStateAction<boolean>) => void {
  return useMessengerStore((state) => state.setIsExpenseSubmitting);
}

export function useIsExpenseMarkingPaid(): boolean {
  return useMessengerStore((state) => state.isExpenseMarkingPaid);
}

export function useIsExpenseMarkingPaidSetter(): (value: SetStateAction<boolean>) => void {
  return useMessengerStore((state) => state.setIsExpenseMarkingPaid);
}

export function useExpenseParticipants(): ContactType[] {
  return useMessengerStore((state) => state.expenseParticipants);
}

export function useExpenseParticipantsSetter(): (
  value: SetStateAction<ContactType[]>,
) => void {
  return useMessengerStore((state) => state.setExpenseParticipants);
}

export function useExpenseOverview(): ExpenseOverviewType | null {
  return useMessengerStore((state) => state.expenseOverview);
}

export function useExpenseOverviewSetter(): (
  value: SetStateAction<ExpenseOverviewType | null>,
) => void {
  return useMessengerStore((state) => state.setExpenseOverview);
}

export function useIsExpensesViewOpen(): boolean {
  return useMessengerStore((state) => state.isExpensesViewOpen);
}

export function useIsExpensesViewOpenSetter(): (value: SetStateAction<boolean>) => void {
  return useMessengerStore((state) => state.setIsExpensesViewOpen);
}

export function useIsExpensesViewLoading(): boolean {
  return useMessengerStore((state) => state.isExpensesViewLoading);
}

export function useIsExpensesViewLoadingSetter(): (value: SetStateAction<boolean>) => void {
  return useMessengerStore((state) => state.setIsExpensesViewLoading);
}

export function useExpensesPanelWidth(): number {
  return useMessengerStore((state) => state.expensesPanelWidth);
}

export function useExpensesPanelWidthSetter(): (value: SetStateAction<number>) => void {
  return useMessengerStore((state) => state.setExpensesPanelWidth);
}

export function useChatExpenses(): ExpenseType[] {
  return useMessengerStore((state) => state.chatExpenses);
}

export function useChatExpensesSetter(): (value: SetStateAction<ExpenseType[]>) => void {
  return useMessengerStore((state) => state.setChatExpenses);
}

export function useExpensePayments(): ExpensePaymentType[] {
  return useMessengerStore((state) => state.expensePayments);
}

export function useExpensePaymentsSetter(): (
  value: SetStateAction<ExpensePaymentType[]>,
) => void {
  return useMessengerStore((state) => state.setExpensePayments);
}

export function useYoutubePreviewVideoId(): string | null {
  return useMessengerStore((state) => state.youtubePreviewVideoId);
}

export function useYoutubePreviewVideoIdSetter(): (
  value: SetStateAction<string | null>,
) => void {
  return useMessengerStore((state) => state.setYoutubePreviewVideoId);
}

export function useIsYouTubeApiReady(): boolean {
  return useMessengerStore((state) => state.isYouTubeApiReady);
}

export function useIsYouTubeApiReadySetter(): (value: SetStateAction<boolean>) => void {
  return useMessengerStore((state) => state.setIsYouTubeApiReady);
}

export function useIsYouTubeApiBlocked(): boolean {
  return useMessengerStore((state) => state.isYouTubeApiBlocked);
}

export function useIsYouTubeApiBlockedSetter(): (value: SetStateAction<boolean>) => void {
  return useMessengerStore((state) => state.setIsYouTubeApiBlocked);
}

export function useIsYouTubePlayerReady(): boolean {
  return useMessengerStore((state) => state.isYouTubePlayerReady);
}

export function useIsYouTubePlayerReadySetter(): (value: SetStateAction<boolean>) => void {
  return useMessengerStore((state) => state.setIsYouTubePlayerReady);
}

export function useSyncedToUserId(): number | null {
  return useMessengerStore((state) => state.syncedToUserId);
}

export function useSyncedToUserIdSetter(): (
  value: SetStateAction<number | null>,
) => void {
  return useMessengerStore((state) => state.setSyncedToUserId);
}

export function useIsWatchRoomSyncing(): boolean {
  return useMessengerStore((state) => state.isWatchRoomSyncing);
}

export function useIsWatchRoomSyncingSetter(): (value: SetStateAction<boolean>) => void {
  return useMessengerStore((state) => state.setIsWatchRoomSyncing);
}

export function useYoutubeAccessMode(): "direct" | "assisted" {
  return useMessengerStore((state) => state.youtubeAccessMode);
}

export function useYoutubeAccessModeSetter(): (
  value: SetStateAction<"direct" | "assisted">,
) => void {
  return useMessengerStore((state) => state.setYoutubeAccessMode);
}

export function useYoutubeAssistEnabled(): boolean {
  return useMessengerStore((state) => state.youtubeAssistEnabled);
}

export function useYoutubeAssistEnabledSetter(): (value: SetStateAction<boolean>) => void {
  return useMessengerStore((state) => state.setYoutubeAssistEnabled);
}

export function useCanEnableYouTubeAssist(): boolean {
  return useMessengerStore((state) => state.canEnableYouTubeAssist);
}

export function useCanEnableYouTubeAssistSetter(): (value: SetStateAction<boolean>) => void {
  return useMessengerStore((state) => state.setCanEnableYouTubeAssist);
}

export function useActiveWatchRoom(): WatchRoomType | null {
  return useMessengerStore((state) => state.activeWatchRoom);
}

export function useActiveWatchRoomSetter(): (
  value: SetStateAction<WatchRoomType | null>,
) => void {
  return useMessengerStore((state) => state.setActiveWatchRoom);
}

export function useWatchRoomChatMessagesByRoomId(): Record<
  string,
  WatchRoomChatMessageType[]
> {
  return useMessengerStore((state) => state.watchRoomChatMessagesByRoomId);
}

export function useWatchRoomChatMessagesByRoomIdSetter(): (
  value: SetStateAction<Record<string, WatchRoomChatMessageType[]>>,
) => void {
  return useMessengerStore((state) => state.setWatchRoomChatMessagesByRoomId);
}

export function useWatchRoomReactionsByRoomId(): Record<
  string,
  Array<{ id: string; emoji: string; x_percent: number; y_percent: number }>
> {
  return useMessengerStore((state) => state.watchRoomReactionsByRoomId);
}

export function useWatchRoomReactionsByRoomIdSetter(): (
  value: SetStateAction<
    Record<string, Array<{ id: string; emoji: string; x_percent: number; y_percent: number }>>
  >,
) => void {
  return useMessengerStore((state) => state.setWatchRoomReactionsByRoomId);
}

export function useWatchRoomPlaybackSeconds(): number {
  return useMessengerStore((state) => state.watchRoomPlaybackSeconds);
}

export function useWatchRoomPlaybackSecondsSetter(): (value: SetStateAction<number>) => void {
  return useMessengerStore((state) => state.setWatchRoomPlaybackSeconds);
}

export function useWatchRoomsByKey(): Record<string, WatchRoomType> {
  return useMessengerStore((state) => state.watchRoomsByKey);
}

export function useWatchRoomsByKeySetter(): (
  value: SetStateAction<Record<string, WatchRoomType>>,
) => void {
  return useMessengerStore((state) => state.setWatchRoomsByKey);
}

export function useIsWatchRoomInviteModalOpen(): boolean {
  return useMessengerStore((state) => state.isWatchRoomInviteModalOpen);
}

export function useIsWatchRoomInviteModalOpenSetter(): (
  value: SetStateAction<boolean>,
) => void {
  return useMessengerStore((state) => state.setIsWatchRoomInviteModalOpen);
}

export function useWatchRoomInviteUserId(): number | null {
  return useMessengerStore((state) => state.watchRoomInviteUserId);
}

export function useWatchRoomInviteUserIdSetter(): (
  value: SetStateAction<number | null>,
) => void {
  return useMessengerStore((state) => state.setWatchRoomInviteUserId);
}
