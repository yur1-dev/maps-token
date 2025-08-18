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
  title: "Google Earth - Moon | High-Resolution Lunar Surface",
  description:
    "Explore the Moon in stunning detail with Google Earth. Navigate the lunar surface with high-resolution satellite imagery from NASA. Experience Mare Tranquillitatis, Tycho Crater, and other iconic lunar features in 3D.",
  keywords: [
    "Google Earth",
    "Moon",
    "lunar surface",
    "NASA",
    "satellite imagery",
    "3D moon",
    "space exploration",
    "Mare Tranquillitatis",
    "Tycho Crater",
    "Apollo landing sites",
  ],
  authors: [{ name: "Google Earth Team" }],
  creator: "Google Earth",
  publisher: "Google",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://maps-token-flame.vercel.app",
    siteName: "Google Earth - Moon",
    title: "Google Earth - Moon | Explore the Lunar Surface",
    description:
      "Experience the Moon like never before with Google Earth's high-resolution 3D lunar surface viewer. Navigate craters, seas, and Apollo landing sites.",
    images: [
      {
        url: "/og-moon-image.jpg", // You'll need to add this image to your public folder
        width: 1200,
        height: 630,
        alt: "Google Earth Moon - 3D Lunar Surface",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@googlearth",
    creator: "@googlearth",
    title: "Google Earth - Moon | Explore the Lunar Surface",
    description:
      "Experience the Moon in stunning 3D detail with Google Earth's satellite imagery.",
    images: ["/og-moon-image.jpg"],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#4F85F4",
      },
    ],
  },
  alternates: {
    canonical: "https://maps-token-flame.vercel.app",
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preload critical resources */}
        <link
          rel="preload"
          href="/Moon_1_3474.glb"
          as="fetch"
          crossOrigin="anonymous"
        />

        {/* Performance and security headers */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />

        {/* Structured data for search engines */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Google Earth - Moon",
              description:
                "Explore the Moon in stunning detail with Google Earth's high-resolution 3D lunar surface viewer.",
              url: "https://maps-token-flame.vercel.app",
              applicationCategory: "EducationalApplication",
              operatingSystem: "Web Browser",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              creator: {
                "@type": "Organization",
                name: "Google",
                url: "https://google.com",
              },
              about: {
                "@type": "CelestialBody",
                name: "Moon",
                description: "Earth's natural satellite",
              },
            }),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
