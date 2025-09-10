import React from 'react';

type TopBarProps = {
  title?: string;
  rightSlot?: React.ReactNode;
  maxWidthClassName?: string;
};

export default function TopBar({ title = 'MUSE CORE', rightSlot, maxWidthClassName = 'max-w-5xl' }: TopBarProps) {
  return (
    <div className="bg-slate-900/95 backdrop-blur-sm border-b border-white/20 px-4 py-4 sticky top-0 z-50">
      <div className={`${maxWidthClassName} mx-auto`}>
        <div className="flex items-center justify-between">
          <a href="/" className="text-purple-200 hover:text-white transition-colors">
            {title}
          </a>
          <div className="text-sm text-purple-300">{rightSlot}</div>
        </div>
      </div>
    </div>
  );
}


