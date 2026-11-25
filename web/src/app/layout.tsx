import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Customer Churn Predictor & Retention Planner — Ruangguru AI Bootcamp",
  description:
    "Prediksi risiko churn pelanggan berbasis Machine Learning deterministik (L2 Logistic Regression) dan penyusunan strategi retensi personal berbasis Gemini AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#f8fafc] text-[#0f172a] antialiased selection:bg-[#0f766e]/15 selection:text-[#0f766e]">
        {children}
      </body>
    </html>
  );
}
