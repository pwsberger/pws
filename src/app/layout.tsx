import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PWS Sportmarketing Experiment",
  description: "A/B-onderzoek naar sportmarketing en koopgedrag.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
