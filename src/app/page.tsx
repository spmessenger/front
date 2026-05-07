"use client";

import React from "react";
import Link from "next/link";
import styles from "./page.module.css";
import { Button } from "antd";

const baseText = "Your";
const words = ["style", "vibe", "messenger"];

export default function Home() {
  const [displayText, setDisplayText] = React.useState("");
  const [currentWordIndex, setCurrentWordIndex] = React.useState(0);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    const typingSpeed = isDeleting ? 75 : 120;
    const pauseDurationMs = 1400;
    const currentFullText = `${baseText} ${words[currentWordIndex]}`;

    if (!isDeleting && displayText === currentFullText) {
      const pauseTimer = window.setTimeout(() => setIsDeleting(true), pauseDurationMs);
      return () => window.clearTimeout(pauseTimer);
    }

    if (isDeleting && displayText === `${baseText} `) {
      setIsDeleting(false);
      setCurrentWordIndex((index) => (index + 1) % words.length);
      return;
    }

    const typingTimer = window.setTimeout(() => {
      if (isDeleting) {
        setDisplayText(currentFullText.slice(0, Math.max(baseText.length + 1, displayText.length - 1)));
      } else {
        setDisplayText(currentFullText.slice(0, displayText.length + 1));
      }
    }, typingSpeed);

    return () => window.clearTimeout(typingTimer);
  }, [currentWordIndex, displayText, isDeleting]);

  return (
    <main className={styles.page}>
      <div className={styles.background} aria-hidden="true">
        <span className={`${styles.rect} ${styles.rect1}`} />
        <span className={`${styles.rect} ${styles.rect2}`} />
        <span className={`${styles.rect} ${styles.rect3}`} />
        <span className={`${styles.rect} ${styles.rect4}`} />
        <span className={`${styles.rect} ${styles.rect5}`} />
        <span className={`${styles.rect} ${styles.rect6}`} />
        <span className={`${styles.rect} ${styles.rect7}`} />
        <span className={`${styles.rect} ${styles.rect8}`} />
        <span className={`${styles.rect} ${styles.rect9}`} />
        <span className={`${styles.rect} ${styles.rect10}`} />
      </div>

      <section className={styles.content}>
        <h1 className={styles.title}>
          {displayText}
          <span className={styles.cursor}>|</span>
        </h1>
        <p className={styles.subtitle}>Customize your messaging workspace</p>
        <Link href="/login">
          <Button type="primary" size="large" style={{marginTop: 20}}>Enter</Button>
        </Link>
      </section>
    </main>
  );
}
