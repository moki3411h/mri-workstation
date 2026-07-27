import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MRI Pro Workstation — Educational Simulator',
  description: 'An interactive educational MRI scanner simulator inspired by clinical workstations. Featuring multi-plane viewing, scan simulation, MRI physics education, and protocol planning.',
  keywords: ['MRI simulator', 'radiology education', 'medical imaging', 'MRI physics', 'DICOM viewer'],
  authors: [{ name: 'MRI Pro Workstation' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#04060a',
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
