import React, { Fragment } from "react";
import { Avatar, Button, Drawer, Flex, Menu } from "antd";
import { MoreOutlined } from "@ant-design/icons";

function ControlPanelHeader() {
  return (
    <Flex align="center">
      <Avatar
        size="large"
        src="https://api.dicebear.com/7.x/miniavs/svg?seed=1"
      />
      <label>Username</label> {/* TODO: replace label with proper component */}
    </Flex>
  );
}

export default function ControlPanel() {
  const [open, setOpen] = React.useState(false);
  const items = [
    { key: "1", label: "Мой профиль" },
    { key: "2", label: "Создать группу" },
    { key: "3", label: "Настройки" },
  ];
  return (
    <Fragment>
      <Drawer
        open={open}
        placement="left"
        title={<ControlPanelHeader />}
        onClose={() => setOpen(false)}
      >
        <Menu selectable={false} items={items} mode="vertical" />
      </Drawer>
      <Flex align="center" justify="center" style={{ height: "100%" }}>
        <Button
          icon={<MoreOutlined />}
          onClick={() => setOpen(true)}
        />
      </Flex>
    </Fragment>
  );
}
