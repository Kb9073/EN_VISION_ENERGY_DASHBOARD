import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono, Orbitron } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "@/components/providers"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })
const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron" })

export const metadata: Metadata = {
  title: "EN-VISION | AI-Driven Energy Intelligence",
  description: "Smart Energy Optimization and Carbon Analytics Platform",
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#070707",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${geistMono.variable} ${orbitron.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  )
}
