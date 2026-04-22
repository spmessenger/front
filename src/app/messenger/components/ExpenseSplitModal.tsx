"use client";

import React from "react";
import { Button, Checkbox, Input, InputNumber, Modal as AntdModal, Select, Switch, Typography } from "antd";
import type { ContactType, ExpenseOverviewType } from "@/lib/types";

const { Text } = Typography;

type ExpenseSplitFormData = {
  title: string;
  amountMinor: number;
  currency: string;
  payerUserId: number | null;
  participantUserIds: number[];
  sharesMinor?: Array<{ user_id: number; share_minor: number }>;
};

interface ExpenseSplitModalProps {
  open: boolean;
  participants: ContactType[];
  currentUserId: number | null;
  overview: ExpenseOverviewType | null;
  messengerTheme: "retro" | "mono";
  isSubmitting: boolean;
  isMarkingPaid: boolean;
  onCancel: () => void;
  onCreate: (data: ExpenseSplitFormData) => Promise<void>;
  onMarkSettlementPaid: (payload: {
    from_user_id: number;
    to_user_id: number;
    amount_minor: number;
  }) => Promise<void>;
}

function formatMinor(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

export default function ExpenseSplitModal({
  open,
  participants,
  currentUserId,
  overview,
  messengerTheme,
  isSubmitting,
  isMarkingPaid,
  onCancel,
  onCreate,
  onMarkSettlementPaid,
}: ExpenseSplitModalProps) {
  const [title, setTitle] = React.useState("");
  const [amountMajor, setAmountMajor] = React.useState<number>(0);
  const [currency, setCurrency] = React.useState("RUB");
  const [payerUserId, setPayerUserId] = React.useState<number | null>(null);
  const [participantUserIds, setParticipantUserIds] = React.useState<number[]>([]);
  const [isCustomSplit, setIsCustomSplit] = React.useState(false);
  const [customSharesMajorByUserId, setCustomSharesMajorByUserId] = React.useState<Record<number, number>>({});

  const amountMinor = Math.round((amountMajor || 0) * 100);
  const nameByUserId = React.useMemo(
    () => new Map<number, string>(participants.map((participant) => [participant.id, participant.username])),
    [participants],
  );

  React.useEffect(() => {
    if (!open) {
      return;
    }
    const availableIds = participants.map((participant) => participant.id);
    const initialPayerId = currentUserId && availableIds.includes(currentUserId)
      ? currentUserId
      : (availableIds[0] ?? null);
    setPayerUserId(initialPayerId);
    setParticipantUserIds(initialPayerId ? [initialPayerId] : []);
    setTitle("");
    setAmountMajor(0);
    setCurrency("RUB");
    setIsCustomSplit(false);
    setCustomSharesMajorByUserId({});
  }, [open, participants, currentUserId]);

  const participantOptions = participants.map((participant) => ({
    label: participant.username,
    value: participant.id,
  }));
  const customSplitSumMinor = participantUserIds.reduce(
    (sum, userId) => sum + Math.round((customSharesMajorByUserId[userId] ?? 0) * 100),
    0,
  );
  const customSplitIsValid = !isCustomSplit || customSplitSumMinor === amountMinor;

  return (
    <AntdModal
      title="Split expense"
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      className={
        messengerTheme === "mono"
          ? "youtube-preview-modal watch-room-modal watch-room-modal-mono"
          : "youtube-preview-modal watch-room-modal watch-room-modal-retro"
      }
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>,
        <Button
          key="create"
          type="primary"
          loading={isSubmitting}
          disabled={
            title.trim().length === 0 ||
            amountMinor <= 0 ||
            payerUserId === null ||
            participantUserIds.length === 0 ||
            !participantUserIds.includes(payerUserId) ||
            !customSplitIsValid
          }
          onClick={() => {
            const sharesMinor = isCustomSplit
              ? participantUserIds.map((userId) => ({
                  user_id: userId,
                  share_minor: Math.round((customSharesMajorByUserId[userId] ?? 0) * 100),
                }))
              : undefined;
            void onCreate({
              title: title.trim(),
              amountMinor,
              currency: currency.trim().toUpperCase() || "RUB",
              payerUserId,
              participantUserIds,
              sharesMinor,
            });
          }}
        >
          Create
        </Button>,
      ]}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Expense title (e.g. Dinner)"
        />
        <InputNumber
          value={amountMajor}
          onChange={(value) => setAmountMajor(Number(value ?? 0))}
          min={0}
          precision={2}
          step={0.01}
          style={{ width: "100%" }}
          placeholder="Amount (e.g. 123.45)"
        />
        <Input
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
          placeholder="Currency (e.g. RUB)"
          maxLength={8}
        />
        <Select
          value={payerUserId ?? undefined}
          onChange={(value) => setPayerUserId(value)}
          options={participantOptions}
          placeholder="Who paid?"
        />
        <Checkbox.Group
          value={participantUserIds}
          onChange={(values) => {
            const nextIds = values.map((value) => Number(value));
            setParticipantUserIds(nextIds);
            setCustomSharesMajorByUserId((current) => {
              const next: Record<number, number> = {};
              nextIds.forEach((id) => {
                next[id] = current[id] ?? 0;
              });
              return next;
            });
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {participants.map((participant) => (
              <label
                key={participant.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 8px",
                  border: "1px solid var(--mess-soft-border)",
                  borderRadius: "8px",
                }}
              >
                <Checkbox value={participant.id} />
                <Text>{participant.username}</Text>
              </label>
            ))}
          </div>
        </Checkbox.Group>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Text>Custom split</Text>
          <Switch
            checked={isCustomSplit}
            onChange={(checked) => setIsCustomSplit(checked)}
          />
        </div>
        {isCustomSplit ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {participantUserIds.map((userId) => (
              <div
                key={userId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                }}
              >
                <Text>{nameByUserId.get(userId) ?? `User ${userId}`}</Text>
                <InputNumber
                  value={customSharesMajorByUserId[userId] ?? 0}
                  min={0}
                  precision={2}
                  step={0.01}
                  onChange={(value) => {
                    setCustomSharesMajorByUserId((current) => ({
                      ...current,
                      [userId]: Number(value ?? 0),
                    }));
                  }}
                />
              </div>
            ))}
            <Text style={{ color: customSplitIsValid ? "var(--mess-muted-text)" : "#ff6b6b" }}>
              {`Custom split total: ${formatMinor(customSplitSumMinor)} ${currency.toUpperCase()} (target ${formatMinor(amountMinor)})`}
            </Text>
          </div>
        ) : null}
        {overview ? (
          <div
            style={{
              marginTop: "6px",
              padding: "8px 10px",
              borderRadius: "8px",
              border: "1px solid var(--mess-soft-border)",
              background: "var(--mess-soft-card-bg)",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <Text strong>{`Current total: ${formatMinor(overview.total_expenses_minor)} ${overview.currency}`}</Text>
            <Text>{`Open expenses: ${overview.open_expense_count}`}</Text>
            {overview.settlements.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {overview.settlements.slice(0, 6).map((settlement) => {
                  const fromName = nameByUserId.get(settlement.from_user_id) ?? `User ${settlement.from_user_id}`;
                  const toName = nameByUserId.get(settlement.to_user_id) ?? `User ${settlement.to_user_id}`;
                  const canMarkPaid = currentUserId === null
                    ? false
                    : (currentUserId === settlement.from_user_id || currentUserId === settlement.to_user_id);
                  return (
                    <div
                      key={`${settlement.from_user_id}-${settlement.to_user_id}-${settlement.amount_minor}`}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}
                    >
                      <Text>
                        {`${fromName} -> ${toName}: ${formatMinor(settlement.amount_minor)} ${overview.currency}`}
                      </Text>
                      <Button
                        size="small"
                        disabled={!canMarkPaid || isMarkingPaid}
                        loading={isMarkingPaid}
                        onClick={() => {
                          void onMarkSettlementPaid({
                            from_user_id: settlement.from_user_id,
                            to_user_id: settlement.to_user_id,
                            amount_minor: settlement.amount_minor,
                          });
                        }}
                      >
                        Mark paid
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Text>Everyone is settled up.</Text>
            )}
          </div>
        ) : null}
      </div>
    </AntdModal>
  );
}
