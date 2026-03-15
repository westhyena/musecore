import { Play, Mic, Music, Video, Wand2 } from "lucide-react";
import AppLayout from '@/components/layout/AppLayout';
import { useI18n } from '@/i18n/I18nContext';

export default function HomePage() {
  const { t } = useI18n();

  return (
    <AppLayout title="MUSE CORE" containerMaxWidthClassName="max-w-4xl">
      <div className="text-center mb-12">
        <h2 className="text-5xl font-light mb-6 text-white tracking-tight">
          {t("home.title")}
        </h2>
        <p className="text-xl text-[#9ca3af] mb-8 tracking-tight">
          {t("home.subtitle")}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 md:items-stretch">
        <a href="/metronome" className="group block h-full">
          <div className="daw-card h-full p-8 transition-all duration-300 group-hover:scale-[1.02] group-hover:border-[#007AFF]/30 flex flex-col">
            <div className="text-center">
              <div className="mb-6">
                <Play
                  size={64}
                  className="mx-auto text-[#007AFF] group-hover:text-[#39FF14] transition-colors"
                />
              </div>
              <h2 className="text-3xl font-light mb-4 text-white tracking-tight">
                {t("home.metronome.title")}
              </h2>
              <p className="text-[#9ca3af] mb-6">
                {t("home.metronome.desc")}
              </p>
              <div className="flex justify-center gap-4 text-sm text-[#6b7280]">
                <span>• {t("home.metronome.features.0")}</span>
                <span>• {t("home.metronome.features.1")}</span>
                <span>• {t("home.metronome.features.2")}</span>
              </div>
            </div>
          </div>
        </a>

        <a href="/tuner" className="group block h-full">
          <div className="daw-card h-full p-8 transition-all duration-300 group-hover:scale-[1.02] group-hover:border-[#007AFF]/30 flex flex-col">
            <div className="text-center">
              <div className="mb-6">
                <Mic
                  size={64}
                  className="mx-auto text-[#007AFF] group-hover:text-[#39FF14] transition-colors"
                />
              </div>
              <h2 className="text-3xl font-light mb-4 text-white tracking-tight">
                {t("home.tuner.title")}
              </h2>
              <p className="text-[#9ca3af] mb-6">
                {t("home.tuner.desc")}
              </p>
              <div className="flex justify-center gap-4 text-sm text-[#6b7280]">
                <span>• {t("home.tuner.features.0")}</span>
                <span>• {t("home.tuner.features.1")}</span>
                <span>• {t("home.tuner.features.2")}</span>
              </div>
            </div>
          </div>
        </a>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mt-8 md:items-stretch">
        <a href="/official-audio" className="group block h-full">
          <div className="daw-card h-full p-8 transition-all duration-300 group-hover:scale-[1.02] group-hover:border-[#007AFF]/30 flex flex-col">
            <div className="text-center">
              <div className="mb-6">
                <Video
                  size={64}
                  className="mx-auto text-[#007AFF] group-hover:text-[#39FF14] transition-colors"
                />
              </div>
              <h2 className="text-3xl font-light mb-4 text-white tracking-tight">
                {t("home.officialAudio.title")}
              </h2>
              <p className="text-[#9ca3af] mb-6">
                {t("home.officialAudio.desc")}
              </p>
              <div className="flex justify-center gap-4 text-sm text-[#6b7280]">
                <span>• {t("home.officialAudio.features.0")}</span>
                <span>• {t("home.officialAudio.features.1")}</span>
                <span>• {t("home.officialAudio.features.2")}</span>
              </div>
            </div>
          </div>
        </a>

        <a href="/mastering" className="group block h-full">
          <div className="daw-card h-full p-8 transition-all duration-300 group-hover:scale-[1.02] group-hover:border-[#007AFF]/30 flex flex-col">
            <div className="text-center">
              <div className="mb-6">
                <Wand2
                  size={64}
                  className="mx-auto text-[#007AFF] group-hover:text-[#39FF14] transition-colors"
                />
              </div>
              <h2 className="text-3xl font-light mb-4 text-white tracking-tight">
                {t("home.mastering.title")}
              </h2>
              <p className="text-[#9ca3af] mb-6">
                {t("home.mastering.desc")}
              </p>
              <div className="flex justify-center gap-4 text-sm text-[#6b7280]">
                <span>• {t("home.mastering.features.0")}</span>
                <span>• {t("home.mastering.features.1")}</span>
                <span>• {t("home.mastering.features.2")}</span>
              </div>
            </div>
          </div>
        </a>
      </div>

      <div className="text-center mt-12">
        <p className="text-[#9ca3af] text-lg tracking-tight">
          {t("home.chooseTool")}
        </p>
      </div>
    </AppLayout>
  );
}
