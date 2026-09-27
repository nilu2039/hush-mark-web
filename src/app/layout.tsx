import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { QueryProvider } from "@/components/query-provider";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "HushMark — Protect personal information",
  description: "Review and redact personal information from text, documents, and audio.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
