import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ToastProvider } from "@/components/ui/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InvoiceComply - Conformité e-Facture 2026",
  description: "Solution de conformité e-facture pour les PME françaises. Conversion PDF vers Factur-X, transmission Chorus Pro, validation automatique.",
  keywords: "facture électronique, Factur-X, Chorus Pro, conformité 2026, PME France, dématérialisation, TVA",
  authors: [{ name: "InvoiceComply" }],
  creator: "InvoiceComply",
  publisher: "InvoiceComply",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://invoicecomply.fr',
    siteName: 'InvoiceComply',
    title: 'InvoiceComply - Conformité e-Facture 2026',
    description: 'Solution de conformité e-facture pour les PME françaises. Conversion PDF vers Factur-X, transmission Chorus Pro.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'InvoiceComply - Conformité e-Facture 2026',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@InvoiceComply',
    creator: '@InvoiceComply',
    title: 'InvoiceComply - Conformité e-Facture 2026',
    description: 'Solution de conformité e-facture pour les PME françaises.',
    images: ['/twitter-image.jpg'],
  },
  alternates: {
    canonical: 'https://invoicecomply.fr',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
