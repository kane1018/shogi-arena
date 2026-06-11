import type { Metadata, Viewport } from "next";
import { Shippori_Mincho, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";

const shippori = Shippori_Mincho({
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-shippori",
});

const notoSans = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto-sans",
});

export const metadata: Metadata = {
  title: "盤聖 -BANSEI- | 将棋大会プラットフォーム",
  description:
    "美しい将棋盤で対局し、トーナメント大会をスムーズに運営できる将棋大会プラットフォーム。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${shippori.variable} ${notoSans.variable} h-full antialiased`}>
      <body className="min-h-dvh flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="border-t border-sumi/10 py-6 text-center text-xs text-sumi/50">
          盤聖 -BANSEI- 将棋大会プラットフォーム
        </footer>
      </body>
    </html>
  );
}
