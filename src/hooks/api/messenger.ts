import React from "react";
import type { ContactType } from "@/lib/types";
import MessengerApi from "@/lib/api/messenger";

export function useFetchContacts() {
  const [contacts, setContacts] = React.useState<ContactType[]>([]);

  React.useEffect(() => {
    let ignore = false;

    const fetchContacts = async () => {
      try {
        const { data } = await MessengerApi.getAvailableUsers();

        if (ignore) {
          return;
        }

        setContacts(
          data.map((contact) => ({
            ...contact,
            avatar_url:
              contact.avatar_url ??
              `https://api.dicebear.com/7.x/miniavs/svg?seed=${contact.id}`,
          }))
        );
      } catch (error) {
        if (!ignore) {
          console.error("Failed to fetch available users", error);
          setContacts([]);
        }
      }
    };

    void fetchContacts();

    return () => {
      ignore = true;
    };
  }, []);

  return contacts;
}
