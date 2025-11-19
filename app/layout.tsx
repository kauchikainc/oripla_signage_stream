import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '同期動画プレーヤー',
  description: '複数デバイス間で動画を同期再生',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
