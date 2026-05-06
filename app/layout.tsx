import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NRTHRN STRONG — Ledelsesdashboard',
  description: 'Intern ledelses- og lønplatform for NRTHRN Strong',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="da">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
