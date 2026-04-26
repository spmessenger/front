import { Button, Flex, message } from "antd";
import { SettingOutlined } from "@ant-design/icons";
import ChatGroupItem from "./ChatGroupItem";
import {
  useChatFolders,
  useChatFoldersSetter,
  useChats,
  useSelectedFolderId,
  useSelectedFolderIdSetter,
} from "@/hooks/features/messenger/chats";
import { useModalSetter } from "@/hooks/features/ui/modal";
import GroupSettingsModalContent from "../GroupSettingsModalContent";
import MessengerApi from "@/lib/api/messenger";
import { ALL_CHATS_GROUP_ID } from "../../constants";

export interface ChatGroupType {
  id: number;
  title: string;
  unread_messages_count: number;
}

export default function ChatGroupsList() {
  const selectedGroupId = useSelectedFolderId();
  const groups = useChatFolders();
  const setSelectedFolderId = useSelectedFolderIdSetter();
  const setModal = useModalSetter();
  const chats = useChats();
  const setChatFolders = useChatFoldersSetter();
  const handleOpenGroupSettings = () => {
    setModal({
      open: true,
      title: "Group settings",
      footer: null,
      onCancel: () => setModal({ clear: true }),
      content: (
        <GroupSettingsModalContent
          chats={chats}
          groups={groups.filter((group) => group.id !== ALL_CHATS_GROUP_ID)}
          onCancel={() => setModal({ clear: true })}
          onSave={(groups) => {
            MessengerApi.replaceChatGroups(groups)
              .then((res) => {
                const nextGroups = res.data;
                setChatFolders(nextGroups);
                setSelectedFolderId((currentSelectedFolderId) => {
                  if (currentSelectedFolderId === ALL_CHATS_GROUP_ID) {
                    return currentSelectedFolderId;
                  }

                  return nextGroups.some(
                    (group) => group.id === currentSelectedFolderId,
                  )
                    ? currentSelectedFolderId
                    : ALL_CHATS_GROUP_ID;
                });
                setModal({ clear: true });
              })
              .catch(() => {
                message.error("Failed to save chat groups.");
              });
          }}
        />
      ),
    });
  };
  return (
    <Flex vertical align="center" gap="10px" style={{ padding: "10px 0" }}>
      {groups.map((group) => (
        <ChatGroupItem
          key={group.id}
          group={group}
          isActive={selectedGroupId === group.id}
          onSelect={() => setSelectedFolderId(group.id)}
        />
      ))}
      <Button
        type="text"
        size="small"
        icon={<SettingOutlined />}
        title="Group settings"
        aria-label="Group settings"
        onClick={handleOpenGroupSettings}
        style={{ color: "var(--foreground)" }}
      />
    </Flex>
  );
}
