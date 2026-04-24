import type { Metadata } from "next";
import { Anton, Cormorant_Garamond, Space_Mono } from "next/font/google";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});

const cormorant = Cormorant_Garamond({
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-cormorant",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: "CinePulse",
  description: "Where every frame lives forever",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${cormorant.variable} ${spaceMono.variable} h-full`}
    >
      <body className="h-full bg-cp-bg text-cp-text antialiased">
        {children}
      </body>
    </html>
  );
}
