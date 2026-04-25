"use client";

import React from "react";
import { Button, Divider, Empty, Spin, Typography } from "antd";
import {
  useChatExpenses,
  useExpenseOverview,
  useExpenseParticipants,
  useExpensePayments,
  useIsExpensesViewLoading,
  useIsExpensesViewOpen,
  useIsExpensesViewOpenSetter,
  useMessengerTheme,
} from "@/hooks/features/messenger/chats";

const { Text } = Typography;

function formatMinor(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

export default function ChatExpensesPanel() {
  const open = useIsExpensesViewOpen();
  const setIsExpensesViewOpen = useIsExpensesViewOpenSetter();
  const messengerTheme = useMessengerTheme();
  const isLoading = useIsExpensesViewLoading();
  const participants = useExpenseParticipants();
  const expenses = useChatExpenses();
  const overview = useExpenseOverview();
  const payments = useExpensePayments();

  if (!open) {
    return null;
  }

  const nameByUserId = new Map<number, string>(participants.map((participant) => [participant.id, participant.username]));
  const currency = overview?.currency ?? expenses[0]?.currency ?? "RUB";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: messengerTheme === "mono" ? "#0c0f12" : "var(--mess-shell-bg)",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      <div
        style={{
          padding: "10px",
          borderBottom: "1px solid var(--mess-soft-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <Text strong>Expenses</Text>
        <Button size="small" onClick={() => setIsExpensesViewOpen(false)}>
          Close
        </Button>
      </div>
      <div
        style={{
          padding: "10px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          minHeight: 0,
        }}
      >
        {isLoading ? (
          <div style={{ minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Spin />
          </div>
        ) : (
          <>
            <Text strong>Overview</Text>
            <Text>{`Total: ${formatMinor(overview?.total_expenses_minor ?? 0)} ${currency}`}</Text>
            <Text>{`Open expenses: ${overview?.open_expense_count ?? 0}`}</Text>

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
            <Text strong>Outstanding</Text>
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

            <Divider style={{ margin: "6px 0" }} />
            <Text strong>Expenses</Text>
            {expenses.length ? (
              expenses.slice().reverse().map((expense) => {
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
              payments.slice().reverse().map((payment) => {
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
          </>
        )}
      </div>
    </div>
  );
}
