import { Coffee } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { useI18n } from '@/i18n/I18nContext';

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <AppLayout title={t("about.title")} containerMaxWidthClassName="max-w-3xl">
      <div className="prose prose-invert max-w-none">
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            {t("about.section1.title")}
          </h2>
          <p className="text-[#9ca3af] leading-relaxed">
            {t("about.section1.content")}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            {t("about.section2.title")}
          </h2>
          <p className="text-[#9ca3af] leading-relaxed mb-4">
            {t("about.section2.content")}
          </p>
          <ul className="list-disc list-inside text-[#9ca3af] space-y-2">
            <li>{t("about.section2.role1")}</li>
            <li>{t("about.section2.role2")}</li>
            <li>{t("about.section2.role3")}</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            {t("about.section3.title")}
          </h2>
          <p className="text-[#9ca3af] leading-relaxed mb-4">
            {t("about.section3.content")}
          </p>
          <a
            href="https://ko-fi.com/chaezlab"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#FF5E5B]/10 border border-[#FF5E5B]/30 text-[#FF5E5B] hover:bg-[#FF5E5B]/20 transition-colors"
          >
            <Coffee size={20} />
            {t("about.section3.button")}
          </a>
        </section>
      </div>
    </AppLayout>
  );
}
