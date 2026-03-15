import React from 'react';
import { useI18n } from '@/i18n/I18nContext';

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-auto border-t border-white/10 bg-[#0a0a0c]/80 backdrop-blur-sm">
      <div className="container mx-auto max-w-5xl px-4 py-4">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-sm text-[#9ca3af]">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-6">
            <a
              href="/privacy"
              className="text-sm text-[#9ca3af] transition-colors hover:text-[#007AFF]"
            >
              {t("footer.privacyPolicy")}
            </a>
            <a
              href="/terms"
              className="text-sm text-[#9ca3af] transition-colors hover:text-[#007AFF]"
            >
              {t("footer.termsOfService")}
            </a>
            <a
              href="/about"
              className="text-sm text-[#9ca3af] transition-colors hover:text-[#007AFF]"
            >
              {t("footer.aboutUs")}
            </a>
            <a
              href="/contact"
              className="text-sm text-[#9ca3af] transition-colors hover:text-[#007AFF]"
            >
              {t("footer.contact")}
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
