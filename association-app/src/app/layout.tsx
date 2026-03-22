import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UN SEUL COEUR",
  description: "Application de gestion de l'association UN SEUL COEUR",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }
    ],
    shortcut: ["/icons/icon-192.png"]
  },
  openGraph: {
    title: "UN SEUL COEUR",
    description: "Application de gestion de l'association UN SEUL COEUR",
    siteName: "UN SEUL COEUR",
    images: [
      {
        url: "/usc-og.png",
        width: 1200,
        height: 630,
        alt: "UN SEUL COEUR"
      }
    ],
    type: "website",
    locale: "fr_FR"
  },
  twitter: {
    card: "summary_large_image",
    title: "UN SEUL COEUR",
    description: "Application de gestion de l'association UN SEUL COEUR",
    images: ["/usc-og.png"]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}