import React from 'react';
import TopBar from './TopBar';

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
    <div className="flex-1 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-y-auto">
      <TopBar title={title} rightSlot={rightSlot} maxWidthClassName={maxWidthClassName ?? containerMaxWidthClassName} />
      <div className={`container mx-auto px-4 py-8 ${containerMaxWidthClassName}`}>
        {children}
      </div>
    </div>
  );
}


