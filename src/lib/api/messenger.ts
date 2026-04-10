import axios from "@/lib/axios";
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
    const apiBaseUrl = "http://localhost:8000";
    const wsBaseUrl = apiBaseUrl.replace(/^http/, "ws");
    return new WebSocket(`${wsBaseUrl}/api/ws/chats`);
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
