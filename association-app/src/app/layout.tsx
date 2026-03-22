import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UN SEUL COEUR",
  description: "Application de gestion",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/icons/icon-192.png" }
    ],
  },
  openGraph: {
    title: "UN SEUL COEUR",
    images: ["/usc-og.png"],
  },
};

export default function RootLayout({ children }: any) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}