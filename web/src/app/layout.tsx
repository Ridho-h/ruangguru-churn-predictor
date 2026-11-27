import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Prediksi Churn Pelanggan",
  description:
    "Analisis risiko pelanggan berhenti berlangganan dari file CSV dan susun prioritas tindak lanjut retensi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${dmSans.variable} ${ibmPlexMono.variable}`}>
      <body className="min-h-screen bg-[#FAF9F7] text-[#1C1917] antialiased selection:bg-stone-900/10 selection:text-stone-950">
        {children}
      </body>
    </html>
  );
}
