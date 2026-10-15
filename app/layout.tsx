import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { StoreProvider } from '@/lib/store'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic', 'cyrillic-ext'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'AvtoEmir — автошкола в Туркестане и Карнаке',
  description:
    'AvtoEmir: запись в автошколу (категории B, B1, C, C1), теория ПДД, тесты, запись на вождение, чат с инструктором. Қазақша / Русский.',
  manifest: '/manifest.json',
  applicationName: 'AvtoEmir',
  appleWebApp: {
    capable: true,
    title: 'AvtoEmir',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: true },
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#1d4fd8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className={`${inter.variable} bg-background`}>
      <body className="font-sans antialiased">
        <StoreProvider>{children}</StoreProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`,
          }}
        />
      </body>
    </html>
  )
}
