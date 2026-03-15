import React, { useState } from 'react';
import { useLocation } from 'react-router';
import TopBar from './TopBar';
import Footer from './Footer';
import Sidebar from './Sidebar';
import BannerAd from '@/components/ads/BannerAd';

type AppLayoutProps = {
  children: React.ReactNode;
  title?: string;
  rightSlot?: React.ReactNode;
  maxWidthClassName?: string;
  containerMaxWidthClassName?: string;
};

export default function AppLayout({
  children,
  title,
  rightSlot,
  maxWidthClassName,
  containerMaxWidthClassName = 'max-w-5xl',
}: AppLayoutProps) {
  const location = useLocation();
  const pathname = location?.pathname;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const showAd = !(
    pathname === '/' ||
    pathname?.startsWith('/metronome') ||
    pathname?.startsWith('/tuner')
  );

  return (
    <div className="flex min-h-screen bg-[#0a0a0c] text-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
        <TopBar
          title={title}
          rightSlot={rightSlot}
          maxWidthClassName={maxWidthClassName ?? containerMaxWidthClassName}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={() => setSidebarOpen((prev) => !prev)}
        />
        <main className={`container mx-auto flex-1 px-4 py-8 pb-20 md:pb-8 overflow-y-auto ${containerMaxWidthClassName}`}>
          {children}
        </main>
        {showAd && (
          <div className="shrink-0 border-t border-white/5">
            <BannerAd position="bottom" className="py-4" />
          </div>
        )}
        <Footer />
      </div>
    </div>
  );
}


