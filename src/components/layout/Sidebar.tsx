import React, { useState } from "react";
import { Link, useLocation } from "react-router";
import { Play, Mic, Video, Wand2, Home, Menu, X } from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";

const menuItems = [
  { path: "/", labelKey: "nav.home", icon: Home },
  { path: "/metronome", labelKey: "nav.metronome", icon: Play },
  { path: "/tuner", labelKey: "nav.tuner", icon: Mic },
  { path: "/official-audio", labelKey: "nav.officialAudio", icon: Video },
  { path: "/mastering", labelKey: "nav.mastering", icon: Wand2 },
];

export default function Sidebar() {
  const location = useLocation();
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

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
          onClick={() => setIsOpen(false)}
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
          <Link to="/" className="block mb-2">
            <span className="text-lg font-semibold tracking-tight text-white">
              MUSE CORE
            </span>
          </Link>
          <NavContent />
        </div>
      </aside>

      {/* Mobile: Toggle button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed bottom-4 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-xl bg-[#007AFF] text-white shadow-lg"
        aria-label={t("nav.menuOpen")}
      >
        <Menu size={24} />
      </button>

      {/* Mobile: Overlay sidebar */}
      {isOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <aside className="md:hidden fixed left-0 top-0 z-50 h-full w-64 flex-col border-r border-white/10 bg-[#0a0a0c] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <span className="text-lg font-semibold text-white">MUSE CORE</span>
              <button
                onClick={() => setIsOpen(false)}
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
