import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./dashboard.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = { title: "NIRA Control Centre", description: "NIRA WhatsApp operations back office" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={inter.variable}><body>{children}</body></html>;
}
