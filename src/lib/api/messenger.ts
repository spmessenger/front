import axios from "@/lib/axios";
import type {
  ChatCreationType,
  ChatMessageApiType,
  ContactType,
  CreateGroupPayload,
} from "@/lib/types";

export default class MessengerApi {
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
}
