import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CBTO Shopfloor Operations Web App',
  description: 'Hệ thống điều hành sản xuất hiện trường CBTO: Sản lượng, Loss Time, Runtime, CIP, AM và Giao ca điện tử.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'CBTO Shopfloor Operations Web App',
    description: 'Hệ thống điều hành sản xuất hiện trường CBTO: Sản lượng, Loss Time, Runtime, CIP, AM và Giao ca điện tử.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CBTO Shopfloor Operations Web App',
    description: 'Hệ thống điều hành sản xuất hiện trường CBTO: Sản lượng, Loss Time, Runtime, CIP, AM và Giao ca điện tử.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#E31837',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full bg-[#F5F6F8] text-[#202124] antialiased">
      <body suppressHydrationWarning className="h-full overflow-x-hidden font-sans bg-[#F5F6F8] text-[#202124]">
        {children}
      </body>
    </html>
  );
}
