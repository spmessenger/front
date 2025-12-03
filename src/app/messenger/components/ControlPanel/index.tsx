import React, { Fragment } from "react";
import { Avatar, Button, Drawer, Flex, Input, Menu, Upload } from "antd";
import Text from "antd/lib/typography/Text";
import { LoadingOutlined, MoreOutlined, PlusOutlined } from "@ant-design/icons";
import { useModalSetter } from "@/hooks/features/ui/modal";

enum MenuItemKey {
  Profile,
  CreateGroup,
  Settings,
}

function CreateGroupModal() {
  const setModal = useModalSetter();
  const [state, setState] = React.useState<number>(0);
  const [title, setTitle] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    switch (state) {
      case 0:
        setModal({
          open: true,
          okText: "Далее",
          cancelText: "Отмена",
          onOk: () => setState(1),
          onCancel: () => setModal({ clear: true }), // TODO: here need to discard menukey state
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
              />
            </Flex>
          ),
        });
        break;
      case 1:
        setModal({
          open: true,
          title: "Добавить участников",
          content: title,
          cancelText: "Назад",
          okText: "Создать",
          onCancel: () => setState(0),
        });
        break;
    }
  }, [state]);
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
    setMenuKey(Number(key));
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
