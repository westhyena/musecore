import AppLayout from '@/components/layout/AppLayout';
import { useI18n } from '@/i18n/I18nContext';

export default function PrivacyPage() {
  const { t } = useI18n();

  return (
    <AppLayout title={t("privacy.title")} containerMaxWidthClassName="max-w-3xl">
      <div className="prose prose-invert max-w-none">
        <p className="text-[#9ca3af] text-lg mb-8">
          {t("privacy.lastUpdated")}
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            {t("privacy.section1.title")}
          </h2>
          <p className="text-[#9ca3af] leading-relaxed">
            {t("privacy.section1.content")}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            {t("privacy.section2.title")}
          </h2>
          <p className="text-[#9ca3af] leading-relaxed">
            {t("privacy.section2.content")}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            {t("privacy.section3.title")}
          </h2>
          <p className="text-[#9ca3af] leading-relaxed">
            {t("privacy.section3.content")}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            {t("privacy.section4.title")}
          </h2>
          <p className="text-[#9ca3af] leading-relaxed">
            {t("privacy.section4.content")}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            {t("privacy.section5.title")}
          </h2>
          <p className="text-[#9ca3af] leading-relaxed">
            {t("privacy.section5.content")}
          </p>
        </section>
      </div>
    </AppLayout>
  );
}
