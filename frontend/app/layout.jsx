import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ToastProvider';
import { AppShell } from '@/components/AppShell';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'TenderPilot AI — AI Bid Manager',
  description:
    'AI Bid and Tender Manager for printing, advertising, and procurement teams—analyze notices, score fit, and run automations.',
  icons: [{ rel: 'icon', url: '/favicon.svg', type: 'image/svg+xml' }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="h-dvh min-h-0 overflow-hidden antialiased bg-slate-50 text-slate-900">
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
