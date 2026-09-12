import type { Metadata, Viewport } from "next";
import { gameContent } from "@/lib/content";
import "./globals.css";

export const metadata: Metadata = {
  title: `${gameContent.title} — Своя игра`,
  description: `Учебная командная викторина: ${gameContent.title}. ${gameContent.audience}. Выбирайте тему, отвечайте на вопросы и набирайте баллы.`,
};
export const viewport: Viewport = {
  themeColor: "#0b1231",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
