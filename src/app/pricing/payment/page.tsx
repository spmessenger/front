"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./page.module.css";
import AuthApi from "@/lib/api/auth";

export default function MockPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tierParam = searchParams.get("tier");
  const selectedTier = tierParam === "premium" ? "premium" : "free";
  const [isPaying, setIsPaying] = React.useState(false);
  const [isDone, setIsDone] = React.useState(false);
  const [errorText, setErrorText] = React.useState<string | null>(null);

  const handlePay = async () => {
    if (isPaying || isDone) {
      return;
    }
    setErrorText(null);
    setIsPaying(true);
    try {
      await AuthApi.completeMockBilling(selectedTier);
      setIsPaying(false);
      setIsDone(true);
      window.setTimeout(() => {
        router.push("/messenger");
      }, 700);
    } catch {
      setIsPaying(false);
      setErrorText("Payment simulation failed. Please try again.");
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>Mock Payment</h1>
        <p className={styles.subtitle}>Demo checkout page. No real payment is processed.</p>

        <div className={styles.plan}>
          <div>
            <div className={styles.label}>Selected tier</div>
            <div className={styles.value}>{selectedTier === "premium" ? "Premium" : "Free"}</div>
          </div>
          <div className={styles.value}>{selectedTier === "premium" ? "$9.99 / mo" : "$0.00"}</div>
        </div>

        <div className={styles.fields}>
          <input className={styles.input} placeholder="Card number (mock)" />
          <div className={styles.row}>
            <input className={styles.input} placeholder="MM / YY" />
            <input className={styles.input} placeholder="CVC" />
          </div>
          <input className={styles.input} placeholder="Cardholder name" />
        </div>

        <div className={styles.actions}>
          <Link href="/pricing" className={styles.btn}>
            Back
          </Link>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={handlePay}>
            {isDone ? "Paid (Mock)" : isPaying ? "Processing..." : "Pay Now"}
          </button>
        </div>
        {errorText ? <p className={styles.fine} style={{ color: "#ff9a9a" }}>{errorText}</p> : null}

        <p className={styles.fine}>
          Mock page only. Hook your real payment provider later (Stripe, YooKassa, etc.).
        </p>
      </section>
    </main>
  );
}
