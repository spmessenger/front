import Link from "next/link";
import styles from "./page.module.css";

const characters = [
  { name: "Cartman", color: styles.cartman },
  { name: "Kyle", color: styles.kyle },
  { name: "Stan", color: styles.stan },
  { name: "Kenny", color: styles.kenny },
];

const features = [
  {
    icon: "💬",
    title: "Instant Messaging",
    description: "Chat with characters in real-time!",
  },
  {
    icon: "👥",
    title: "All Characters",
    description: "Talk to Cartman, Kyle, Stan & more!",
  },
  {
    icon: "🙂",
    title: "Classic Quotes",
    description: "Get iconic South Park responses!",
  },
  {
    icon: "⚡",
    title: "Super Fast",
    description: "Lightning-fast messaging!",
  },
];

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.brand}>SOUTH PARK</p>
        <h1 className={styles.title}>Messenger</h1>
        <p className={styles.subtitle}>
          Chat with your favorite characters! <span>🎭</span>
        </p>

        <div className={styles.characters} aria-label="Featured characters">
          {characters.map((character) => (
            <article className={styles.characterCard} key={character.name}>
              <div className={`${styles.avatar} ${character.color}`}>
                <span className={styles.eyeLeft} />
                <span className={styles.eyeRight} />
                <span className={styles.mouth} />
              </div>
              <p>{character.name}</p>
            </article>
          ))}
        </div>

        <div className={styles.actions}>
          <Link className={styles.primaryButton} href="/login">
            Start Chatting! 🚀
          </Link>
          <Link className={styles.secondaryButton} href="/register">
            Learn More
          </Link>
        </div>
      </section>

      <section className={styles.features}>
        {features.map((feature) => (
          <article className={styles.featureCard} key={feature.title}>
            <div className={styles.featureIcon} aria-hidden="true">
              {feature.icon}
            </div>
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
