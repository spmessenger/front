import React from "react";
import { Typography } from "antd";

const { Text } = Typography;

type ReplyReferenceBlockProps = {
  referenceAuthor: string;
  referenceContent: string;
  referenceMessageId?: number;
  onScrollToMessage: (messageId: number) => void;
};

export default function ReplyReferenceBlock({
  referenceAuthor,
  referenceContent,
  referenceMessageId,
  onScrollToMessage,
}: ReplyReferenceBlockProps) {
  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
        if (referenceMessageId) {
          onScrollToMessage(referenceMessageId);
        }
      }}
      style={{
        borderLeft: "3px solid var(--mess-reply-title)",
        background: "var(--mess-soft-card-bg)",
        borderRadius: "8px",
        padding: "6px 10px",
        marginBottom: "8px",
        cursor: "pointer",
      }}
    >
      <Text
        style={{
          display: "block",
          color: "var(--mess-accent)",
          fontSize: "12px",
          fontWeight: 600,
          marginBottom: "2px",
        }}
      >
        {referenceAuthor}
      </Text>
      <Text style={{ color: "var(--mess-muted-text)", fontSize: "13px" }}>
        {referenceContent}
      </Text>
    </div>
  );
}

