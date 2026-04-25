"use client";

import React from "react";
import { Avatar, Button, Typography } from "antd";
import { HomeFilled } from "@ant-design/icons";
import { Header } from "antd/lib/layout/layout";
import { ENABLE_EXPENSE_SPLIT_FEATURE } from "../constants";
import {
  useIsExpenseModalOpenSetter,
  useIsExpensesViewOpenSetter,
  useIsChatGroupsSyncing,
  useIsChatsSyncing,
  useMessengerTheme,
  useMessengerThemeSetter,
  useSelectedChat,
  useSelectedChatId,
} from "@/hooks/features/messenger/chats";
import { useModalSetter } from "@/hooks/features/ui/modal";

const { Text } = Typography;

export default function WorkspaceHeader() {
  const setModal = useModalSetter();
  const selectedChat = useSelectedChat();
  const selectedChatId = useSelectedChatId();
  const messengerTheme = useMessengerTheme();
  const setMessengerTheme = useMessengerThemeSetter();
  const isChatsSyncing = useIsChatsSyncing();
  const isChatGroupsSyncing = useIsChatGroupsSyncing();
  const setIsExpenseModalOpen = useIsExpenseModalOpenSetter();
  const setIsExpensesViewOpen = useIsExpensesViewOpenSetter();
  const isBackgroundSyncing = isChatsSyncing || isChatGroupsSyncing;
  const isExpenseFeatureEnabled = ENABLE_EXPENSE_SPLIT_FEATURE;

  function handleOpenExpenseModal() {
    if (selectedChatId === null) {
      return;
    }
    setIsExpenseModalOpen(true);
  }

  function handleToggleExpensesView() {
    if (selectedChatId === null) {
      return;
    }
    setIsExpensesViewOpen((current) => !current);
  }

  function handleToggleMessengerTheme() {
    setMessengerTheme((currentTheme) =>
      currentTheme === "retro" ? "mono" : "retro",
    );
  }

  function handleSelectedChatInfoModal() {
    if (!selectedChat) {
      return;
    }

    const closeModal = () => {
      setModal({ clear: true });
    };

    setModal({
      open: true,
      title: "Chat info",
      okText: "Close",
      cancelText: "Cancel",
      onOk: closeModal,
      onCancel: closeModal,
      content: (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 0",
          }}
        >
          <Avatar
            size={48}
            src={selectedChat.avatar_url}
            icon={selectedChat.type === "private" ? <HomeFilled /> : undefined}
          />
          <Text
            strong
            className="retro-pixel-text"
            style={{ fontSize: "16px" }}
          >
            {selectedChat.title}
          </Text>
        </div>
      ),
    });
  }

  return (
    <Header
      style={{
        background: "var(--mess-header)",
        padding: "0 12px",
        cursor: selectedChat ? "pointer" : "default",
        borderBottom: "3px solid var(--line)",
      }}
      onClick={handleSelectedChatInfoModal}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {selectedChat ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              minWidth: 0,
            }}
          >
            <Avatar
              size={36}
              src={selectedChat.avatar_url}
              icon={
                selectedChat.type === "private" ? <HomeFilled /> : undefined
              }
            />
            <span
              className="retro-pixel-text"
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {selectedChat.title}
            </span>
          </div>
        ) : (
          <span className="retro-pixel-text">Select a chat</span>
        )}
        {isBackgroundSyncing ? (
          <Text
            className="retro-pixel-text"
            style={{
              marginLeft: "12px",
              color: "var(--mess-muted-text)",
              fontSize: "10px",
            }}
          >
            Syncing...
          </Text>
        ) : null}
        <Button
          type="default"
          size="small"
          className="retro-pixel-text"
          style={{ marginLeft: "8px" }}
          onClick={(event) => {
            event.stopPropagation();
            handleOpenExpenseModal();
          }}
          disabled={selectedChatId === null}
          hidden={!isExpenseFeatureEnabled}
        >
          Split
        </Button>
        <Button
          type="default"
          size="small"
          className="retro-pixel-text"
          style={{ marginLeft: "8px" }}
          onClick={(event) => {
            event.stopPropagation();
            handleToggleExpensesView();
          }}
          disabled={selectedChatId === null}
          hidden={!isExpenseFeatureEnabled}
        >
          Expenses
        </Button>
        <Button
          type="default"
          size="small"
          className="retro-pixel-text"
          style={{ marginLeft: "8px" }}
          onClick={(event) => {
            event.stopPropagation();
            handleToggleMessengerTheme();
          }}
        >
          {messengerTheme === "retro" ? "Mono" : "Retro"}
        </Button>
      </div>
    </Header>
  );
}
