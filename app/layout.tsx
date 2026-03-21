import type { Metadata } from 'next'
import './globals.css'
import { ClientLayout } from './client-layout'

export const metadata: Metadata = {
  title: 'Agentic AI Payments Resilience Command Center',
  description: 'AI-operated control tower for global payments estate resilience',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
