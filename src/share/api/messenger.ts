import axios from "@/share/axios";

export default class MessengerApi {
  static getChats() {
    return axios.get("/api/chats");
  }
}
