import React from 'react';
import { useI18n } from '@/i18n/I18nContext';

/**
 * AdSense 승인을 위한 콘텐츠 영역 템플릿.
 * 나중에 블로그 글이나 가이드 콘텐츠로 채워 넣을 수 있습니다.
 */
export default function ContentPlaceholder({
  title,
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section className="daw-card mt-8 p-6">
      <h2 className="mb-4 text-xl font-medium tracking-tight text-white">
        {title ?? t("contentPlaceholder.defaultTitle")}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-[#9ca3af]">
        {children ?? (
          <>
            <p>{t("contentPlaceholder.defaultText1")}</p>
            <p>{t("contentPlaceholder.defaultText2")}</p>
          </>
        )}
      </div>
    </section>
  );
}
