import axios from "@/lib/axios";
import { WS_BASE_URL } from "@/lib/config";
import type {
  AttachmentCompletePayload,
  AttachmentCompleteResponse,
  AttachmentDownloadResponse,
  AttachmentInitPayload,
  AttachmentInitResponse,
  ChatCreationType,
  ChatFolderReplaceItemType,
  ChatFolderType,
  ChatMessageContentType,
  ChatMessageApiType,
  ChatMessageDeleteResponse,
  ContactType,
  CreateGroupPayload,
  ExpenseCreatePayloadType,
  ExpenseOverviewType,
  ExpensePaymentType,
  ExpenseType,
  LinkPreviewResponse,
  WatchRoomInviteType,
  WatchRoomChatMessageType,
  WatchRoomType,
} from "@/lib/types";

export default class MessengerApi {
  static getMessagesSocket() {
    return new WebSocket(`${WS_BASE_URL}/api/ws/chats`);
  }

  static getChats() {
    return axios.get("/api/chats");
  }

  static getAvailableUsers() {
    return axios.get<ContactType[]>("/api/available-users");
  }

  static createGroup(payload: CreateGroupPayload) {
    return axios.post<ChatCreationType>("/api/chats/group", payload);
  }

  static createDialog(participantId: number) {
    return axios.post<ChatCreationType>("/api/chats/dialog", {
      participant_id: participantId,
    });
  }

  static getChatMessages(chatId: number) {
    return axios.get<ChatMessageApiType[]>(`/api/chats/${chatId}/messages`);
  }

  static getChatParticipants(chatId: number) {
    return axios.get<ContactType[]>(`/api/chats/${chatId}/participants`);
  }

  static sendMessage(
    chatId: number,
    content: string,
    options?: {
      referenceMessageId?: number;
      forwardedFromMessageId?: number;
      contentType?: ChatMessageContentType;
      attachmentId?: string;
      attachmentGroupId?: string;
    },
  ) {
    return axios.post<ChatMessageApiType>(`/api/chats/${chatId}/messages`, {
      content,
      reference_message_id: options?.referenceMessageId,
      forwarded_from_message_id: options?.forwardedFromMessageId,
      content_type: options?.contentType,
      attachment_id: options?.attachmentId,
      attachment_group_id: options?.attachmentGroupId,
    });
  }

  static deleteMessage(chatId: number, messageId: number) {
    return axios.delete<ChatMessageDeleteResponse>(`/api/chats/${chatId}/messages/${messageId}`);
  }

  static initAttachment(chatId: number, payload: AttachmentInitPayload) {
    return axios.post<AttachmentInitResponse>(`/api/chats/${chatId}/attachments/init`, payload);
  }

  static completeAttachment(
    chatId: number,
    attachmentId: string,
    payload: AttachmentCompletePayload,
  ) {
    return axios.post<AttachmentCompleteResponse>(
      `/api/chats/${chatId}/attachments/${attachmentId}/complete`,
      payload,
    );
  }

  static getAttachmentDownloadUrl(chatId: number, attachmentId: string) {
    return axios.get<AttachmentDownloadResponse>(
      `/api/chats/${chatId}/attachments/${attachmentId}/download`,
    );
  }

  static getLinkPreview(url: string) {
    return axios.get<LinkPreviewResponse>("/api/link-preview", {
      params: { url },
    });
  }

  static createWatchRoom(chatId: number, youtubeVideoId: string) {
    return axios.post<WatchRoomType>("/api/watch-rooms", {
      chat_id: chatId,
      youtube_video_id: youtubeVideoId,
    });
  }

  static getWatchRoomByChat(chatId: number, youtubeVideoId: string) {
    return axios.get<WatchRoomType>(`/api/watch-rooms/by-chat/${chatId}`, {
      params: { youtube_video_id: youtubeVideoId },
    });
  }

  static getWatchRoom(roomId: string) {
    return axios.get<WatchRoomType>(`/api/watch-rooms/room/${roomId}`);
  }

  static getWatchRoomMessages(roomId: string, limit: number = 100) {
    return axios.get<WatchRoomChatMessageType[]>(`/api/watch-rooms/${roomId}/messages`, {
      params: { limit },
    });
  }

  static joinWatchRoom(roomId: string) {
    return axios.post<WatchRoomType>(`/api/watch-rooms/${roomId}/join`);
  }

  static leaveWatchRoom(roomId: string) {
    return axios.post<WatchRoomType>(`/api/watch-rooms/${roomId}/leave`);
  }

  static syncWatchRoom(roomId: string, currentTimeSeconds: number, isPlaying: boolean) {
    return axios.post<WatchRoomType>(`/api/watch-rooms/${roomId}/sync`, {
      current_time_seconds: currentTimeSeconds,
      is_playing: isPlaying,
    });
  }

  static inviteToWatchRoom(roomId: string, targetUserId: number, targetChatId?: number) {
    return axios.post<WatchRoomInviteType>(`/api/watch-rooms/${roomId}/invite`, {
      target_user_id: targetUserId,
      target_chat_id: targetChatId,
    });
  }

  static getWatchRoomInvites() {
    return axios.get<WatchRoomInviteType[]>("/api/watch-rooms/invites");
  }

  static acceptWatchRoomInvite(inviteId: string) {
    return axios.post<WatchRoomType>(`/api/watch-rooms/invites/${inviteId}/accept`);
  }

  static declineWatchRoomInvite(inviteId: string) {
    return axios.post<WatchRoomInviteType>(`/api/watch-rooms/invites/${inviteId}/decline`);
  }

  static pinChat(chatId: number) {
    return axios.post<boolean>(`/api/chats/${chatId}/pin`);
  }

  static unpinChat(chatId: number) {
    return axios.post<boolean>(`/api/chats/${chatId}/unpin`);
  }

  static getChatGroups() {
    return axios.get<ChatFolderType[]>("/api/chat-groups");
  }

  static replaceChatGroups(groups: ChatFolderReplaceItemType[]) {
    return axios.put<ChatFolderType[]>("/api/chat-groups", { groups });
  }

  static createExpense(chatId: number, payload: ExpenseCreatePayloadType) {
    return axios.post<ExpenseType>(`/api/chats/${chatId}/expenses`, payload);
  }

  static getChatExpenses(chatId: number) {
    return axios.get<ExpenseType[]>(`/api/chats/${chatId}/expenses`);
  }

  static getChatExpenseOverview(chatId: number) {
    return axios.get<ExpenseOverviewType>(`/api/chats/${chatId}/expenses/overview`);
  }

  static getChatExpensePayments(chatId: number) {
    return axios.get<ExpensePaymentType[]>(`/api/chats/${chatId}/expenses/payments`);
  }

  static markExpenseSettlementPaid(
    chatId: number,
    payload: {
      from_user_id: number;
      to_user_id: number;
      amount_minor: number;
    },
  ) {
    return axios.post<ExpenseOverviewType>(`/api/chats/${chatId}/expenses/settlements/mark-paid`, payload);
  }
}
