import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Navbar } from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SlotLive - Réservation de créneaux en temps réel',
  description: 'Plateforme haut de gamme de réservation de créneaux en direct pour établissements et clients.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
            <Navbar />
            <main className="flex-1">{children}</main>
            <footer className="border-t border-slate-800/80 py-8 bg-slate-950/80 text-center text-xs text-slate-500">
              <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span>© {new Date().getFullYear()} SlotLive - Démonstration Portfolio GitHub Junior Senior-Level.</span>
                <div className="flex items-center space-x-4">
                  <span className="text-slate-400">NestJS • Next.js • PostgreSQL Exclusion • BullMQ • Socket.io</span>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
