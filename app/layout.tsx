import type { Metadata, Viewport } from 'next';
import { Anybody, Archivo, JetBrains_Mono } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SceneHost from '@/components/SceneHost';
import Effects from '@/components/Effects';
import IceScrollbar from '@/components/IceScrollbar';
import './globals.css';

const display = Anybody({ subsets: ['latin'], axes: ['wdth'], variable: '--font-display', display: 'swap' });
const body = Archivo({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://bipolar-bear.com'),
  title: { default: 'Bipolar Bear Enterprises LLC - Nationwide Freight Solutions', template: '%s · Bipolar Bear Enterprises' },
  description:
    'Leading Trucking Services across the all US. Dispatch, HR & driver support, accounting & factoring, fuel and insurance for owner-operators. MC# 1257747 • US DOT# 3650011.',
  openGraph: { type: 'website', siteName: 'Bipolar Bear Enterprises LLC' },
  appleWebApp: { capable: true, title: 'Bipolar Bear', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#020814',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// Runs before paint: enables reveal animations and picks a lighter effects tier on weak devices.
const BOOT = `(function(){try{var d=document.documentElement,n=navigator,m=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!m)d.classList.add('rv');
var c=n.hardwareConcurrency||4,mem=n.deviceMemory||8,mob=/Android|iPhone|iPad|iPod|Mobile/i.test(n.userAgent),s=n.connection&&n.connection.saveData;
if(s||mem<=2||c<=2||(mob&&(c<=6||mem<=4)))d.classList.add('fx-low');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SceneHost />
        <Effects />
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <IceScrollbar />
      </body>
    </html>
  );
}
