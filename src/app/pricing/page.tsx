import Link from "next/link";
import styles from "./page.module.css";

const PRICING = [
  {
    tier: "Free",
    price: "0 / month",
    features: [
      "Watch room basic",
      "Direct YouTube playback",
      "Standard chat and media",
    ],
    cta: "Current default",
    href: "/messenger",
    premium: false,
  },
  {
    tier: "Premium",
    price: "Contact sales",
    features: [
      "Everything in Free",
      "YouTube assisted access",
      "Network assist priority",
      "Future premium upgrades",
    ],
    cta: "Upgrade",
    href: "/pricing/payment?tier=premium",
    premium: true,
  },
];

export default function PricingPage() {
  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <div className={styles.topbar}>
          <div>
            <h1 className={styles.title}>Pricing</h1>
            <p className={styles.subtitle}>Choose a tier for your messenger experience.</p>
          </div>
          <Link href="/messenger" className={styles.link}>
            Back to messenger
          </Link>
        </div>
        <div className={styles.grid}>
          {PRICING.map((plan) => (
            <article
              key={plan.tier}
              className={`${styles.card} ${plan.premium ? styles.premium : ""}`}
            >
              <h2 className={styles.tierName}>{plan.tier}</h2>
              <p className={styles.price}>{plan.price}</p>
              <ul className={styles.list}>
                {plan.features.map((feature) => (
                  <li key={feature}>- {feature}</li>
                ))}
              </ul>
              <div className={styles.ctaRow}>
                <Link
                  href={plan.href}
                  className={`${styles.button} ${plan.premium ? styles.buttonPremium : ""}`}
                >
                  {plan.cta}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
