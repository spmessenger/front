import axios from "@/lib/axios";

export default class MessengerApi {
  static getChats() {
    return axios.get("/api/chats");
  }
}
