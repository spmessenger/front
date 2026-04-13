import axios from "@/lib/axios";
import { WS_BASE_URL } from "@/lib/config";
import type {
  ChatCreationType,
  ChatFolderReplaceItemType,
  ChatFolderType,
  ChatMessageApiType,
  ContactType,
  CreateGroupPayload,
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

  static sendMessage(chatId: number, content: string) {
    return axios.post<ChatMessageApiType>(`/api/chats/${chatId}/messages`, { content });
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
}
