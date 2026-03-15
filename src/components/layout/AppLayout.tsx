import React from 'react';
import TopBar from './TopBar';
import Footer from './Footer';
import Sidebar from './Sidebar';

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
  return (
    <div className="flex min-h-screen bg-[#0a0a0c] text-white">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
        <TopBar title={title} rightSlot={rightSlot} maxWidthClassName={maxWidthClassName ?? containerMaxWidthClassName} />
        <main className={`container mx-auto flex-1 px-4 py-8 pb-20 md:pb-8 overflow-y-auto ${containerMaxWidthClassName}`}>
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}


