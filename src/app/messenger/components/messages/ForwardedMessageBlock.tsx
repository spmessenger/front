import React from "react";
import { Avatar, Typography } from "antd";

const { Text } = Typography;

type ForwardedMessageBlockProps = {
  forwarderName: string;
  forwardedSourceAuthor: string;
  forwardedSourceContent: string;
  forwardedSourceAuthorAvatarUrl?: string;
};

export default function ForwardedMessageBlock({
  forwarderName,
  forwardedSourceAuthor,
  forwardedSourceContent,
  forwardedSourceAuthorAvatarUrl,
}: ForwardedMessageBlockProps) {
  return (
    <div
      style={{
        borderRadius: "10px",
        background: "var(--mess-soft-card-bg)",
        padding: "8px 10px",
        marginBottom: "8px",
      }}
    >
      <Text
        style={{
          display: "block",
          color: "var(--mess-accent)",
          fontWeight: 600,
          fontSize: "13px",
          marginBottom: "2px",
        }}
      >
        {forwarderName}
      </Text>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "2px",
        }}
      >
        <Text style={{ color: "var(--mess-muted-text)", fontSize: "12px" }}>
          Forwarded from
        </Text>
        <Avatar
          size={18}
          src={forwardedSourceAuthorAvatarUrl}
          style={{ flexShrink: 0 }}
        >
          {forwardedSourceAuthor.slice(0, 1).toUpperCase()}
        </Avatar>
        <Text style={{ color: "var(--mess-text)", fontSize: "12px" }}>
          {forwardedSourceAuthor}
        </Text>
      </div>
      <Text style={{ color: "var(--mess-text)", whiteSpace: "pre-wrap" }}>
        {forwardedSourceContent}
      </Text>
    </div>
  );
}

