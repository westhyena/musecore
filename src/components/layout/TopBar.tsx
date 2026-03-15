import React from 'react';
import { Menu } from 'lucide-react';
import { useI18n } from '@/i18n/I18nContext';

type TopBarProps = {
  title?: string;
  rightSlot?: React.ReactNode;
  maxWidthClassName?: string;
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
};

export default function TopBar({
  rightSlot,
  maxWidthClassName = 'max-w-5xl',
  sidebarOpen = false,
  onSidebarToggle,
}: TopBarProps) {
  const { locale, setLocale, t } = useI18n();

  return (
    <header
      className={`sticky top-0 z-50 h-14 flex items-center border-b border-white/10 bg-[#0a0a0c]/90 pr-14 backdrop-blur-xl ${onSidebarToggle ? 'pl-14 md:pl-0' : ''}`}
    >
      {/* 모바일 햄버거 버튼 */}
      {onSidebarToggle && (
        <button
          onClick={onSidebarToggle}
          className="md:hidden absolute left-4 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-[#9ca3af] hover:bg-white/10 hover:text-white transition-colors"
          aria-label={sidebarOpen ? t('nav.menuClose') : t('nav.menuOpen')}
        >
          <Menu size={24} />
        </button>
      )}
      <div className={`${maxWidthClassName} mx-auto flex min-h-full items-center justify-end px-4 md:px-4`}>
        <div className="text-sm text-[#9ca3af]">{rightSlot}</div>
      </div>
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
          <button
            onClick={() => setLocale('ko')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              locale === 'ko' ? 'bg-[#007AFF] text-white' : 'text-[#9ca3af] hover:text-white'
            }`}
          >
            KO
          </button>
          <button
            onClick={() => setLocale('en')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              locale === 'en' ? 'bg-[#007AFF] text-white' : 'text-[#9ca3af] hover:text-white'
            }`}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
}


