import AppLayout from '@/components/layout/AppLayout';
import { useI18n } from '@/i18n/I18nContext';

export default function TermsPage() {
  const { t } = useI18n();

  return (
    <AppLayout title={t("terms.title")} containerMaxWidthClassName="max-w-3xl">
      <div className="prose prose-invert max-w-none">
        <p className="text-[#9ca3af] text-lg mb-8">
          {t("terms.lastUpdated")}
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            {t("terms.section1.title")}
          </h2>
          <p className="text-[#9ca3af] leading-relaxed">
            {t("terms.section1.content")}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            {t("terms.section2.title")}
          </h2>
          <p className="text-[#9ca3af] leading-relaxed">
            {t("terms.section2.content")}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            {t("terms.section3.title")}
          </h2>
          <p className="text-[#9ca3af] leading-relaxed">
            {t("terms.section3.content")}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            {t("terms.section4.title")}
          </h2>
          <p className="text-[#9ca3af] leading-relaxed">
            {t("terms.section4.content")}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            {t("terms.section5.title")}
          </h2>
          <p className="text-[#9ca3af] leading-relaxed">
            {t("terms.section5.content")}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            {t("terms.section6.title")}
          </h2>
          <p className="text-[#9ca3af] leading-relaxed">
            {t("terms.section6.content")}
          </p>
        </section>
      </div>
    </AppLayout>
  );
}
