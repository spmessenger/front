import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>SP Messenger</h1>
        <p>A frontend shell for authentication, chats, and group messaging.</p>

        <div className={styles.ctas}>
          <Link className={styles.primary} href="/login">
            Sign in
          </Link>
          <Link href="/register" className={styles.secondary}>
            Create account
          </Link>
        </div>
      </main>
      <footer className={styles.footer}>
        <span>Next.js 15 + Ant Design + Jotai</span>
        <span>Backend API expected at `http://localhost:8000`</span>
      </footer>
    </div>
  );
}
