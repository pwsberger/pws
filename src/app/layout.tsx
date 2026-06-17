import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PWS Onderzoek",
  description: "Kort onderzoek voor een profielwerkstuk.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
