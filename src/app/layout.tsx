import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tavern — AI Roleplay",
  description: "AI角色扮演聊天应用",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-zinc-950 text-zinc-100">{children}</body>
    </html>
  );
}
