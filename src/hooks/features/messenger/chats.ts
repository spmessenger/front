import React from "react";
import MessengerApi from "@/lib/api/messenger";

interface Chat {
  id: number;
  title?: string;
  type: string;
}

export function useChats(): Chat[] {
  const [chats, setChats] = React.useState<Chat[]>([]);

  React.useEffect(() => {
    MessengerApi.getChats().then((res) => {
      setChats(res.data);
    });
  }, []);
  return chats;
}
