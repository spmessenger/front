import React, { Fragment } from "react";
import {
  Avatar,
  Button,
  Card,
  Drawer,
  Flex,
  Input,
  Menu,
  message,
} from "antd";
import Text from "antd/lib/typography/Text";
import { LoadingOutlined, MoreOutlined, SearchOutlined } from "@ant-design/icons";
import { useModalSetter } from "@/hooks/features/ui/modal";
import { useFetchContacts } from "@/hooks/api/messenger";
import ChatsList from "../ChatsList";
import MessengerApi from "@/lib/api/messenger";
import AuthApi, { AUTH_USERNAME_STORAGE_KEY } from "@/lib/api/auth";
import type { ChatType, ContactType } from "@/lib/types";
import {
  useChatsSetter,
  useSelectedChatSetter,
} from "@/hooks/features/messenger/chats";
import CreateGroupModal from "./CreateGroupModal";
import ProfileModal from "./ProfileModal";

enum MenuItemKey {
  Profile,
  CreateDialog,
  CreateGroup,
  Settings,
}

function castContactsToChats(contacts: ContactType[]): ChatType[] {
  return contacts.map((contact) => ({
    id: contact.id,
    title: contact.username,
    type: "dialog",
    avatar_url: contact.avatar_url,
  }));
}

function CreateDialogModal({ onClose }: { onClose: () => void }) {
  const setModal = useModalSetter();
  const setChats = useChatsSetter();
  const setSelectedChat = useSelectedChatSetter();
  const { contacts, isLoading: isContactsLoading } = useFetchContacts();
  const [search, setSearch] = React.useState("");
  const [submittingUserId, setSubmittingUserId] = React.useState<number | null>(null);

  const filteredContacts = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return contacts;
    }

    return contacts.filter((contact) =>
      contact.username.toLowerCase().includes(normalizedSearch),
    );
  }, [contacts, search]);

  const closeModal = React.useCallback(() => {
    setModal({ clear: true });
    onClose();
  }, [onClose, setModal]);

  const createDialog = React.useCallback(async (contact: ContactType) => {
    if (submittingUserId !== null) {
      return;
    }

    setSubmittingUserId(contact.id);
    try {
      const { data } = await MessengerApi.createDialog(contact.id);
      const { data: chats } = await MessengerApi.getChats();
      setChats(chats);
      setSelectedChat(data.chat.id);
      message.success(`Dialog with ${contact.username} created.`);
      closeModal();
    } catch {
      message.error("Failed to create dialog.");
    } finally {
      setSubmittingUserId(null);
    }
  }, [closeModal, setChats, setSelectedChat, submittingUserId]);

  React.useEffect(() => {
    const chats = castContactsToChats(filteredContacts);

    setModal({
      open: true,
      title: "Create dialog",
      footer: null,
      onCancel: closeModal,
      content: (
        <Card
          style={{ boxShadow: "none" }}
          variant="borderless"
          title={
            <Input
              placeholder="Search user"
              prefix={<SearchOutlined />}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          }
        >
          {isContactsLoading ? (
            <Flex justify="center" style={{ padding: "24px 0" }}>
              <LoadingOutlined spin />
            </Flex>
          ) : chats.length > 0 ? (
            <ChatsList
              chats={chats}
              onClick={(chat) => {
                const contact = filteredContacts.find(
                  (nextContact) => nextContact.id === chat.id,
                );

                if (!contact || submittingUserId !== null) {
                  return;
                }

                void createDialog(contact);
              }}
            />
          ) : (
            <Text type="secondary">No users found.</Text>
          )}
        </Card>
      ),
    });
  }, [
    closeModal,
    createDialog,
    filteredContacts,
    search,
    setModal,
    submittingUserId,
    isContactsLoading,
  ]);

  return <Fragment />;
}

function ModalManipulator({
  menuKey,
  onClose,
  username,
  avatarUrl,
  onProfileUpdated,
}: {
  menuKey: number;
  onClose: () => void;
  username: string;
  avatarUrl?: string;
  onProfileUpdated: (profile: { username: string; avatar_url?: string }) => void;
}) {
  switch (menuKey) {
    case MenuItemKey.Profile:
      return (
        <ProfileModal
          onClose={onClose}
          username={username}
          avatarUrl={avatarUrl}
          onUpdated={onProfileUpdated}
        />
      );
    case MenuItemKey.CreateDialog:
      return <CreateDialogModal onClose={onClose} />;
    case MenuItemKey.CreateGroup:
      return <CreateGroupModal onClose={onClose} />;
    default:
      return <Fragment />;
  }
}

export default function ControlPanel() {
  const [menuKey, setMenuKey] = React.useState<number>(-1);
  const [open, setOpen] = React.useState(false);
  const [username, setUsername] = React.useState("Username");
  const [avatarUrl, setAvatarUrl] = React.useState<string | undefined>();

  React.useEffect(() => {
    const storedUsername = window.localStorage.getItem(AUTH_USERNAME_STORAGE_KEY);

    if (storedUsername) {
      setUsername(storedUsername);
    }

    AuthApi.getProfile()
      .then(({ data }) => {
        setUsername(data.username);
        setAvatarUrl(data.avatar_url);
        window.localStorage.setItem(AUTH_USERNAME_STORAGE_KEY, data.username);
      })
      .catch(() => {
        // Keep the best-known client value if profile bootstrap fails.
      });
  }, []);

  const items = [
    { key: MenuItemKey.Profile, label: "Profile" },
    { key: MenuItemKey.CreateDialog, label: "Create dialog" },
    { key: MenuItemKey.CreateGroup, label: "Create group" },
    { key: MenuItemKey.Settings, label: "Settings" },
  ];

  const onClick = ({ key }: { key: string }) => {
    setOpen(false);
    setMenuKey(-1);
    setTimeout(() => {
      setMenuKey(Number(key));
    }, 0);
  };

  const closeManipulator = React.useCallback(() => {
    setMenuKey(-1);
  }, []);

  return (
    <Fragment>
      <ModalManipulator
        menuKey={menuKey}
        onClose={closeManipulator}
        username={username}
        avatarUrl={avatarUrl}
        onProfileUpdated={(profile) => {
          setUsername(profile.username);
          setAvatarUrl(profile.avatar_url);
        }}
      />
      <Drawer
        open={open}
        placement="left"
        title={
          <Flex align="center">
            <Avatar
              size="large"
              src={avatarUrl || "https://api.dicebear.com/7.x/miniavs/svg?seed=1"}
            />
            <Text strong>{username}</Text>
          </Flex>
        }
        onClose={() => setOpen(false)}
      >
        <Menu
          selectable={false}
          items={items}
          mode="vertical"
          onClick={onClick}
        />
      </Drawer>
      <Flex align="center" justify="center" style={{ height: "100%" }}>
        <Button icon={<MoreOutlined />} onClick={() => setOpen(true)} />
      </Flex>
    </Fragment>
  );
}
