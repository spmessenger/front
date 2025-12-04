import React, { Fragment } from "react";
import { Avatar, Button, Card, Drawer, Flex, Input, Menu, Upload } from "antd";
import Text from "antd/lib/typography/Text";
import {
  LoadingOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useModalSetter } from "@/hooks/features/ui/modal";
import { useFetchContacts } from "@/hooks/api/messenger";
import ChatsList from "../ChatsList";
import { ChatType, ContactType } from "@/lib/types";

enum MenuItemKey {
  Profile,
  CreateGroup,
  Settings,
}

function castContactsToChats(contacts: ContactType[]): ChatType[] {
  return contacts.map((contact) => ({
    id: contact.id,
    title: contact.username,
    type: "general",
    avatar_url: contact.avatar_url,
  }));
}

function SelectedContact({ contact }: { contact: ContactType }) {
  return (
    <Flex align="center" gap={4} style={{ background: "gray", borderRadius: 16, paddingRight: 6 }}>
      <Avatar size={24} src={contact.avatar_url} />
      <Text>{contact.username}</Text>
    </Flex>
  );
}

function CreateGroupModal() {
  const setModal = useModalSetter();
  const contacts = useFetchContacts();
  const [state, setState] = React.useState<number>(0);
  const [title, setTitle] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [selectedContacts, setSelectedContacts] = React.useState<number[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const onContactClick = (contact: ChatType) => {
    if (selectedContacts.includes(contact.id)) {
      setSelectedContacts(selectedContacts.filter((id) => id !== contact.id));
    } else {
      setSelectedContacts([...selectedContacts, contact.id]);
    }
  };
  const clearState = () => {
    setTitle("");
    if (inputRef.current) {
      inputRef.current.input.value = "";
    }
  };
  React.useEffect(() => {
    switch (state) {
      case 0:
        setModal({
          open: true,
          okText: "Далее",
          cancelText: "Отмена",
          onOk: () => {
            setState(1);
          },
          onCancel: () => {
            setModal({ clear: true });
            clearState();
          },
          content: (
            <Flex gap={10} align="center">
              <Upload
                name="avatar"
                listType="picture-circle"
                className="avatar-uploader"
                showUploadList={false}
              >
                <button style={{ border: 0, background: "none" }} type="button">
                  {loading ? <LoadingOutlined /> : <PlusOutlined />}
                  <div style={{ marginTop: 8 }}>Загрузить</div>
                </button>
              </Upload>
              <Input
                defaultValue={title}
                size="middle"
                placeholder="Название группы"
                onChange={(props) => setTitle(props.target.value)}
                ref={inputRef}
              />
            </Flex>
          ),
        });
        break;
      case 1:
        setModal({
          open: true,
          title: "Добавить участников",
          cancelText: "Назад",
          okText: "Создать",
          onCancel: () => setState(0),
          content: (
            <Card
              style={{ boxShadow: "none" }}
              variant="borderless"
              title={
                <Flex>
                  <Flex className="selected-contacts" gap={8}>
                    {contacts
                      .filter((contact: ContactType) =>
                        selectedContacts.includes(contact.id)
                      )
                      .map((contact: ContactType) => (
                        <SelectedContact key={contact.id} contact={contact} />
                      ))}
                  </Flex>
                  <Input
                    placeholder="Поиск"
                    prefix={<SearchOutlined />}
                    variant="borderless"
                  />
                </Flex>
              }
            >
              <ChatsList
                onClick={onContactClick}
                chats={castContactsToChats(contacts)}
              />
            </Card>
          ),
        });
        break;
    }
  }, [state, selectedContacts]);
  return <Fragment />;
}

function ModalManipulator({ menuKey }: { menuKey: number }) {
  let Manipulator: React.FC = Fragment;
  switch (menuKey) {
    case MenuItemKey.CreateGroup:
      Manipulator = CreateGroupModal;
      break;
    default:
      break;
  }
  return (
    <Fragment>
      <Manipulator />
    </Fragment>
  );
}

export default function ControlPanel() {
  const [menuKey, setMenuKey] = React.useState<number>(-1);
  const [open, setOpen] = React.useState(false);
  const items = [
    { key: MenuItemKey.Profile, label: "Мой профиль" },
    { key: MenuItemKey.CreateGroup, label: "Создать группу" },
    { key: MenuItemKey.Settings, label: "Настройки" },
  ];
  const onClick = ({ key }: { key: string }) => {
    setMenuKey(-1);
    setTimeout(() => {
      setMenuKey(Number(key));
    }, 0);
  };
  return (
    <Fragment>
      <ModalManipulator menuKey={menuKey} />
      <Drawer
        open={open}
        placement="left"
        title={
          <Flex align="center">
            <Avatar
              size="large"
              src="https://api.dicebear.com/7.x/miniavs/svg?seed=1"
            />
            <Text strong>Username</Text>
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
