import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { BOT_NAME } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: BOT_NAME,
  description: `Painel web para autenticação e controle da plataforma ${BOT_NAME}.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} antialiased min-h-screen bg-[var(--color-background)] text-[var(--color-text-main)] flex justify-center`}
      >
        <div className="w-full">{children}</div>
      </body>
    </html>
  );
}
