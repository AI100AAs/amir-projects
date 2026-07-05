import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fix Me — Interactive Bike Repair Guide",
  description:
    "Learn how to fix and maintain your bicycle with interactive step-by-step repair guides. Click on a bike component to get started.",
  keywords: ["bike repair", "bicycle maintenance", "DIY", "cycling", "repair guide"],
  authors: [{ name: "Fix Me" }],
  openGraph: {
    title: "Fix Me — Interactive Bike Repair Guide",
    description: "Learn how to fix and maintain your bicycle with interactive step-by-step repair guides.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
