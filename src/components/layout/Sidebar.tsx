import React from "react";
import { Link, useLocation } from "react-router";
import { Play, Mic, Video, Wand2, Home, Menu, X, BarChart2 } from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";

const menuItems = [
  { path: "/", labelKey: "nav.home", icon: Home },
  { path: "/metronome", labelKey: "nav.metronome", icon: Play },
  { path: "/tuner", labelKey: "nav.tuner", icon: Mic },
  { path: "/audio-analyzer", labelKey: "nav.audioAnalyzer", icon: BarChart2 },
  { path: "/official-audio", labelKey: "nav.officialAudio", icon: Video },
  { path: "/mastering", labelKey: "nav.mastering", icon: Wand2 },
];

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export default function Sidebar({ isOpen = false, onClose = () => {} }: SidebarProps) {
  const location = useLocation();
  const { t } = useI18n();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const NavContent = () => (
    <nav className="flex flex-col gap-1 py-4">
      {menuItems.map(({ path, labelKey, icon: Icon }) => (
        <Link
          key={path}
          to={path}
          onClick={onClose}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
            isActive(path)
              ? "bg-[#007AFF]/20 text-[#007AFF] border-l-2 border-[#007AFF]"
              : "text-[#9ca3af] hover:bg-white/5 hover:text-[#e5e5e5]"
          }`}
        >
          <Icon size={20} className="flex-shrink-0" />
          {t(labelKey)}
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col border-r border-white/10 bg-[#0a0a0c]/95 backdrop-blur-xl">
        <div className="sticky top-0 p-4">
          <Link to="/" className="block mb-4" onClick={onClose}>
            <span
              className="text-xl font-black uppercase tracking-wider text-white block"
              style={{
                textShadow: `
                  0 0 8px rgba(255, 255, 255, 0.9),
                  0 0 16px rgba(255, 150, 255, 0.6),
                  0 0 32px rgba(255, 100, 255, 0.4)
                `,
              }}
            >
              MUSECORE
            </span>
            <span className="text-xs text-white/80 font-normal mt-1 block">
              {t("home.tagline")}
            </span>
          </Link>
          <NavContent />
        </div>
      </aside>

      {/* Mobile: Overlay sidebar (햄버거 버튼은 TopBar에 있음) */}
      {isOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="md:hidden fixed left-0 top-0 z-[60] h-full w-64 flex-col border-r border-white/10 bg-[#0a0a0c] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <Link to="/" className="block" onClick={onClose}>
                <span
                  className="text-xl font-black uppercase tracking-wider text-white block"
                  style={{
                    textShadow: `
                      0 0 8px rgba(255, 255, 255, 0.9),
                      0 0 16px rgba(255, 150, 255, 0.6),
                      0 0 32px rgba(255, 100, 255, 0.4)
                    `,
                  }}
                >
                  MUSECORE
                </span>
              </Link>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-[#9ca3af] hover:bg-white/10 hover:text-white"
                aria-label={t("nav.menuClose")}
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4">
              <NavContent />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
