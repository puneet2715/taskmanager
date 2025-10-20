import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import SessionProvider from '@/components/providers/SessionProvider';
import QueryProvider from '@/components/providers/QueryProvider';
import { SocketProvider } from '@/components/providers/SocketProvider';
import { SocketQueryProvider } from '@/components/providers/SocketQueryProvider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'TaskFlow - Collaborative Task Manager',
    template: '%s | TaskFlow',
  },
  description: 'A real-time collaborative task management application that boosts team productivity with live updates and seamless collaboration.',
  keywords: 'task management, collaboration, real-time, team productivity, project management',
  authors: [{ name: 'TaskFlow Team' }],
  creator: 'TaskFlow',
  publisher: 'TaskFlow',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://taskflow.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://taskflow.com',
    siteName: 'TaskFlow',
    title: 'TaskFlow - Collaborative Task Manager',
    description: 'A real-time collaborative task management application that boosts team productivity.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TaskFlow - Collaborative Task Manager',
    description: 'A real-time collaborative task management application that boosts team productivity.',
    creator: '@taskflow',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryProvider>
          <SessionProvider>
            <SocketProvider>
              <SocketQueryProvider>
                {children}
                <Toaster position="top-right" />
              </SocketQueryProvider>
            </SocketProvider>
          </SessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
