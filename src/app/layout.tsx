import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://mriproworkstation.com'),
  title: 'MRI Pro Workstation — Plan. Scan. Learn.',
  description: 'A browser-based educational MRI workstation for brain, spine, cardiac, abdominal, pelvic, and musculoskeletal protocol planning, acquisition simulation, and image review.',
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
    title: 'MRI Pro Workstation — Plan. Scan. Learn.',
    description: 'Professional multi-region MRI workflow simulation for education and training.',
    url: 'https://mriproworkstation.com',
    images: [
      {
        url: '/og-whole-body.jpg',
        width: 1200,
        height: 630,
        alt: 'MRI Pro Workstation whole-body MRI workflow simulation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MRI Pro Workstation — Plan. Scan. Learn.',
    description: 'Professional multi-region MRI workflow simulation for education and training.',
    images: ['/og-whole-body.jpg'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0A101A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ minHeight: '100vh', background: '#04060a' }}>
        {children}
        <div id="toast-root" aria-live="polite" aria-label="Notifications" />
      </body>
    </html>
  );
}
