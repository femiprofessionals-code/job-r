import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Nav } from '@/components/nav';
import { FlashToast } from '@/components/flash-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'Job Radar',
  description: 'Job Radar finds roles matched to your career track and ships tailored application drafts.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <Nav />
        <Suspense>
          <FlashToast />
        </Suspense>
        <main className="container py-8">{children}</main>
      </body>
    </html>
  );
}
