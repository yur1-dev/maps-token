import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Google Earth - Moon",
  description:
    "Explore the Moon in stunning detail with Google Earth. High-resolution lunar surface imagery powered by NASA data.",
  metadataBase: new URL("https://maps-token-flame.vercel.app"),
  openGraph: {
    title: "Google Earth - Moon",
    description:
      "Explore the Moon in stunning detail with Google Earth. High-resolution lunar surface imagery powered by NASA data.",
    url: "https://maps-token-flame.vercel.app",
    siteName: "Google Earth - Moon",
    type: "website",
    images: [
      {
        url: "/moon-preview.jpg", // Put your image in public folder
        width: 1200,
        height: 630,
        alt: "Google Earth Moon Explorer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Google Earth - Moon",
    description:
      "Explore the Moon in stunning detail with Google Earth. High-resolution lunar surface imagery powered by NASA data.",
    images: ["/moon-preview.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
