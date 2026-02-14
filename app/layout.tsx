import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Sistema Delivery',
  description: 'Delivery com chatbot e Pix'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
