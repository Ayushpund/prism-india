import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Bricolage_Grotesque, Lexend } from 'next/font/google';
import './globals.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap', weight: ['600', '700', '800'] });
const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Prism India · Same search, different India',
  description: 'Live Google results from six Indian cities, side by side. See how the same search shows a different India.',
};
export const viewport: Viewport = { themeColor: '#F2EEE3' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} ${sans.variable} ${lexend.variable}`}>
      <body className="min-h-screen bg-paper font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
