import type { Metadata } from 'next'
import { Inter, Geist, DM_Serif_Display, DM_Sans } from 'next/font/google'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import './globals.css'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const dmSerifDisplay = DM_Serif_Display({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-serif-display',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

export const metadata: Metadata = {
  title: 'Coast — Wholesale Vehicle Marketplace',
  description: 'Buy and sell wholesale vehicles entirely online.',
  openGraph: {
    title: 'Coast — Wholesale Vehicle Marketplace',
    description: 'Buy and sell wholesale vehicles entirely online.',
    siteName: 'Coast',
    images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coast — Wholesale Vehicle Marketplace',
    images: ['/opengraph-image'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable, dmSerifDisplay.variable, dmSans.variable)}>
      <body className="font-sans antialiased">
        <NuqsAdapter>
          {children}
        </NuqsAdapter>
        <Toaster richColors position="top-right" />
        <Analytics />
      </body>
    </html>
  )
}
