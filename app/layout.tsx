import type { Metadata } from "next";
import { Source_Serif_4, Public_Sans, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const display = Source_Serif_4({
  variable: "--font-c4u-display",
  subsets: ["latin"],
  display: "swap",
});

const sans = Public_Sans({
  variable: "--font-c4u-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-c4u-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "cell4you",
  description:
    "Hire 100 salespeople in 2 minutes. A voice AI sales force for SMBs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full c4u-body-root">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
