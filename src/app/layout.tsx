import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://mri-workstation.vercel.app'),
  title: 'MRI Pro Workstation',
  description: 'An interactive educational MRI scanner simulator inspired by clinical workstations. PLAN • SCAN • LEARN',
  keywords: ['MRI simulator', 'radiology education', 'medical imaging', 'MRI physics', 'DICOM viewer'],
  authors: [{ name: 'MRI Pro Workstation' }],
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    apple: [
      { url: '/apple-touch-icon.png' }
    ],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'MRI Pro Workstation',
    description: 'PLAN • SCAN • LEARN',
    url: 'https://mri-workstation.vercel.app',
    images: [
      {
        url: '/logo-full.png',
        width: 1024,
        height: 1024,
        alt: 'MRI Pro Workstation Logo',
      },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0A101A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: '100%', overflow: 'hidden' }}>
      <body style={{ height: '100%', overflow: 'hidden', background: '#04060a' }}>
        {children}
        <div id="toast-root" aria-live="polite" aria-label="Notifications" />
      </body>
    </html>
  );
}
