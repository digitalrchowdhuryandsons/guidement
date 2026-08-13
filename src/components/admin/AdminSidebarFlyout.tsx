import { useEffect, useRef, useState } from "react";
import { LucideIcon, LogOut } from "lucide-react";

export type FlyoutItem = { value: string; label: string; badge?: number | string };
export type FlyoutGroup = { key: string; icon: LucideIcon; label: string; items: FlyoutItem[] };

interface Props {
  groups: FlyoutGroup[];
  activeGroupKey: string;
  onNavigate: (tab: string) => void;
  displayName: string;
  roleLabel: string;
  onLogout: () => void;
}

const CLOSE_DELAY_MS = 180;

export default function AdminSidebarFlyout({ groups, activeGroupKey, onNavigate, displayName, roleLabel, onLogout }: Props) {
  const safeName = displayName?.trim() ? displayName : "Admin";
  const safeRole = roleLabel?.trim() ? roleLabel : "";
  const [hovered, setHovered] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openGroup = (key: string) => {
    clearCloseTimer();
    setHovered(key);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setHovered(null), CLOSE_DELAY_MS);
  };

  useEffect(() => () => clearCloseTimer(), []);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[96px] flex-col bg-[#1c162f] lg:flex">
      <div className="flex h-[75px] shrink-0 items-center justify-center border-b border-white/5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] font-bold text-white">A</div>
      </div>

      <nav className="flex-1 space-y-1 overflow-visible px-2 py-4">
        {groups.map((group) => {
          const Icon = group.icon;
          const isActiveGroup = group.key === activeGroupKey;
          const isHovered = hovered === group.key;
          return (
            <div key={group.key} className="relative" onMouseEnter={() => openGroup(group.key)} onMouseLeave={scheduleClose}>
              <button
                className={`flex w-full flex-col items-center gap-1 rounded-xl py-2.5 text-[10px] font-medium transition-colors ${
                  isActiveGroup ? "bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white" : "text-[#8b8aa3] hover:bg-white/5 hover:text-white"
                }`}
                onClick={() => group.items[0] && onNavigate(group.items[0].value)}
              >
                <Icon className="h-5 w-5" />
                <span className="max-w-[60px] truncate">{group.label}</span>
              </button>

              {/* Invisible bridge closes the gap between the icon and the flyout so the
                  pointer never leaves a hoverable region while moving toward the panel —
                  this (plus the close delay above) is what makes the flyout stable. */}
              {isHovered && group.items.length > 0 && (
                <>
                  <div className="absolute left-full top-0 h-full w-3" />
                  <div
                    className="absolute left-[calc(100%+12px)] top-0 z-40 w-56 rounded-xl border border-white/10 bg-[#241a3d] p-2 shadow-2xl"
                    onMouseEnter={() => openGroup(group.key)}
                    onMouseLeave={scheduleClose}
                  >
                    <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8b8aa3]">{group.label}</p>
                    <div className="space-y-0.5">
                      {group.items.map((item, idx) => (
                        <button
                          key={`${group.key}-${idx}-${item.value}-${item.label}`}
                          onClick={() => { onNavigate(item.value); setHovered(null); }}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-[#d8d6e8] hover:bg-white/10 hover:text-white"
                        >
                          {item.label}
                          {item.badge != null && (
                            <span className="rounded-full bg-[#ec4899]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#ec4899]">{item.badge}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/5 p-2">
        <button
          className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-white/5"
          onClick={() => onNavigate("settings")}
          title={safeName}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-xs font-bold text-white">
            {safeName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">{safeName}</p>
            <p className="truncate text-[10px] text-[#8b8aa3]">{safeRole}</p>
          </div>
        </button>
        <button
          onClick={() => onLogout?.()}
          className="mt-1 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-xs font-medium text-[#8b8aa3] hover:bg-white/5 hover:text-[#f43f5e]"
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>
    </aside>
  );
}