'use client';

import dynamic from 'next/dynamic';

const LandingPageContent = dynamic(() => import('./LandingPageContent'), {
  ssr: false,
});

export default function LandingPage() {
  return <LandingPageContent />;
}
