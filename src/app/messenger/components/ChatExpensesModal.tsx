"use client";

import React from "react";
import { Modal as AntdModal, Typography, Spin, Empty, Divider } from "antd";
import type { ContactType, ExpenseOverviewType, ExpensePaymentType, ExpenseType } from "@/lib/types";

const { Text } = Typography;

interface ChatExpensesModalProps {
  open: boolean;
  onCancel: () => void;
  messengerTheme: "retro" | "mono";
  isLoading: boolean;
  participants: ContactType[];
  expenses: ExpenseType[];
  overview: ExpenseOverviewType | null;
  payments: ExpensePaymentType[];
}

function formatMinor(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

export default function ChatExpensesModal({
  open,
  onCancel,
  messengerTheme,
  isLoading,
  participants,
  expenses,
  overview,
  payments,
}: ChatExpensesModalProps) {
  const nameByUserId = React.useMemo(
    () => new Map<number, string>(participants.map((participant) => [participant.id, participant.username])),
    [participants],
  );

  const currency = overview?.currency ?? expenses[0]?.currency ?? "RUB";

  return (
    <AntdModal
      title="Chat expenses"
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={null}
      width="94vw"
      className={
        messengerTheme === "mono"
          ? "youtube-preview-modal watch-room-modal watch-room-modal-mono"
          : "youtube-preview-modal watch-room-modal watch-room-modal-retro"
      }
    >
      {isLoading ? (
        <div style={{ minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Spin />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div
            style={{
              border: "1px solid var(--mess-soft-border)",
              borderRadius: "10px",
              padding: "10px",
              background: "var(--mess-soft-card-bg)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              minHeight: 260,
            }}
          >
            <Text strong>Overview</Text>
            <Text>{`Total expenses: ${formatMinor(overview?.total_expenses_minor ?? 0)} ${currency}`}</Text>
            <Text>{`Open expense items: ${overview?.open_expense_count ?? 0}`}</Text>
            <Divider style={{ margin: "6px 0" }} />
            <Text strong>Balances</Text>
            {overview?.balances.length ? (
              overview.balances.map((balance) => {
                const name = nameByUserId.get(balance.user_id) ?? `User ${balance.user_id}`;
                const sign = balance.balance_minor > 0 ? "+" : "";
                return (
                  <Text key={balance.user_id}>
                    {`${name}: ${sign}${formatMinor(balance.balance_minor)} ${currency}`}
                  </Text>
                );
              })
            ) : (
              <Text>No balances yet.</Text>
            )}
            <Divider style={{ margin: "6px 0" }} />
            <Text strong>Outstanding settlements</Text>
            {overview?.settlements.length ? (
              overview.settlements.map((settlement, index) => {
                const fromName = nameByUserId.get(settlement.from_user_id) ?? `User ${settlement.from_user_id}`;
                const toName = nameByUserId.get(settlement.to_user_id) ?? `User ${settlement.to_user_id}`;
                return (
                  <Text key={`${settlement.from_user_id}-${settlement.to_user_id}-${index}`}>
                    {`${fromName} -> ${toName}: ${formatMinor(settlement.amount_minor)} ${currency}`}
                  </Text>
                );
              })
            ) : (
              <Text>Everyone is settled.</Text>
            )}
          </div>

          <div
            style={{
              border: "1px solid var(--mess-soft-border)",
              borderRadius: "10px",
              padding: "10px",
              background: "var(--mess-soft-card-bg)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              minHeight: 260,
            }}
          >
            <Text strong>Expenses</Text>
            {expenses.length ? (
              expenses
                .slice()
                .reverse()
                .map((expense) => {
                  const payerName = nameByUserId.get(expense.payer_user_id) ?? `User ${expense.payer_user_id}`;
                  return (
                    <div
                      key={expense.id}
                      style={{
                        border: "1px solid var(--mess-soft-border)",
                        borderRadius: "8px",
                        padding: "8px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <Text strong>{expense.title}</Text>
                      <Text>{`${formatMinor(expense.amount_minor)} ${expense.currency}`}</Text>
                      <Text>{`Paid by ${payerName}`}</Text>
                      <Text style={{ color: "var(--mess-muted-text)" }}>
                        {new Date(expense.created_at * 1000).toLocaleString()}
                      </Text>
                    </div>
                  );
                })
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No expenses yet" />
            )}
            <Divider style={{ margin: "6px 0" }} />
            <Text strong>Paid log</Text>
            {payments.length ? (
              payments
                .slice()
                .reverse()
                .map((payment) => {
                  const fromName = nameByUserId.get(payment.from_user_id) ?? `User ${payment.from_user_id}`;
                  const toName = nameByUserId.get(payment.to_user_id) ?? `User ${payment.to_user_id}`;
                  return (
                    <Text key={payment.id}>
                      {`${fromName} paid ${toName}: ${formatMinor(payment.amount_minor)} ${currency}`}
                    </Text>
                  );
                })
            ) : (
              <Text>No payments recorded.</Text>
            )}
          </div>
        </div>
      )}
    </AntdModal>
  );
}
