import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/app/components/sidebar";
import ToastContainer from "@/app/components/toast";
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
  title: "NoesaaID Content Engine",
  description: "AI-powered short-form video engine by NoesaaID.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full bg-[#0a0a0a] antialiased`}
    >
      <body className="min-h-full bg-[#0a0a0a] text-zinc-100">
        <Sidebar />
        <ToastContainer />
        <main className="ml-[60px] flex flex-col items-center">
          {children}
        </main>
      </body>
    </html>
  );
}
