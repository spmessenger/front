import React from "react";
import type { ContactType } from "@/lib/types";

export function useFetchContacts() {
  const [contacts, setContacts] = React.useState<ContactType[]>([]);
  React.useEffect(() => {
    setContacts([
      {
        id: 1,
        username: "user1",
        avatar_url: "https://api.dicebear.com/7.x/miniavs/svg?seed=1",
      },
      {
        id: 2,
        username: "user2",
        avatar_url: "https://api.dicebear.com/7.x/miniavs/svg?seed=2",
      },
    ]); // TODO: implement
  }, []);
  return contacts;
}
