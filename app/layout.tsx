import './globals.css'
import type { Metadata, Viewport } from 'next'
import { TransitProvider } from '@/components/transit-context'
import { ThemeProvider } from '@/components/theme-context'
import AppShell from '@/components/app-shell'
import { ServiceWorkerRegistration, PwaInstallBanner, OfflineBar } from '@/components/pwa'

export const metadata: Metadata = {
  title: 'MetroFlow — Delhi Transit',
  description: 'Premium real-time Delhi Metro companion. Live arrivals, route planning, offline support.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MetroFlow',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#080808' },
    { media: '(prefers-color-scheme: light)', color: '#f5f4f0' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap"
          rel="stylesheet"
        />
        {/* Apple PWA icons */}
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        {/* Anti-flash theme script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('metroflow:theme');if(!t){t=window.matchMedia('(prefers-color-scheme:light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <TransitProvider>
            <OfflineBar />
            <AppShell>{children}</AppShell>
            <PwaInstallBanner />
          </TransitProvider>
        </ThemeProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
