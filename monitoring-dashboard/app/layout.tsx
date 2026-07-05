import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { APP_NAME } from "@/lib/constants";
import { QueryProvider } from "@/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — AIOps Dashboard`,
    template: `%s — ${APP_NAME}`,
  },
  description:
    "AI-powered Linux server monitoring dashboard with real-time metrics, anomaly detection, and alert management.",
  keywords: ["linux", "monitoring", "aiops", "server", "dashboard", "gemini"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
