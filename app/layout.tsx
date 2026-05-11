import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Peec AI — AI search analytics for marketing teams",
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
      </body>
    </html>
  );
}
