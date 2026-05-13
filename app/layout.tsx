import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Surgeaio AI Visibility Tool — Track your brand across AI & Google",
  description:
    "Track, analyze, and improve brand performance on AI search platforms through Visibility, Position, and Sentiment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${GeistSans.variable} ${GeistMono.variable} min-h-screen font-sans antialiased`}>
        {children}
        <Toaster richColors theme="dark" position="top-center" />
      </body>
    </html>
  );
}
