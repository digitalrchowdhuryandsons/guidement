import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, LucideIcon } from "lucide-react";
import { Link} from "react-router-dom";

export type NavItem = {
  value: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  /** Restrict visibility to these roles. Omit to show to every admin-console visitor. */
  roles?: string[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

interface AdminSidebarProps {
  navGroups: NavGroup[];
  role: string;
  userName: string;
  userRoleLabel: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function AdminSidebar({
  navGroups,
  role,
  userName,
  userRoleLabel,
  collapsed,
  onToggleCollapsed,
}: AdminSidebarProps) {
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-20 hidden flex-col bg-[#14213d] text-white transition-[width] duration-200 lg:flex ${
        collapsed ? "w-[76px]" : "w-[258px]"
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-6">
        
        {!collapsed && (
          <div className="leading-tight">
            <Link to="/" className="flex items-center gap-2">
                 <img src="/logo1.png" alt="GuideMent" className="h-20 w-auto" />
                </Link>
            <p className="text-xs uppercase tracking-wide text-[#8ea3c9]">Admin Console</p>
          </div>
        )}
      </div>

      <TabsList className="h-auto flex-1 flex-col items-stretch justify-start gap-5 overflow-y-auto bg-transparent px-3 py-3">
        {visibleGroups.map((group) => (
          <div key={group.label || "main"} className="space-y-2">
            {group.label && !collapsed && (
              <p className="px-2 text-[11px] uppercase tracking-[0.2em] text-[#8ea3c9]/60">{group.label}</p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  title={collapsed ? item.label : undefined}
                  className={`group relative flex w-full items-center gap-3 rounded-lg bg-transparent px-3 py-2 text-sm font-medium text-[#8ea3c9] hover:text-white data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-white ${
                    collapsed ? "justify-center" : "justify-start"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                  {!collapsed && item.badge != null && (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold">{item.badge}</span>
                  )}
                  <span
                    className={`absolute h-1.5 w-1.5 rounded-full bg-[#2a9d8f] opacity-0 group-data-[state=active]:opacity-100 ${
                      collapsed ? "right-1 top-1" : "-left-1"
                    }`}
                  />
                </TabsTrigger>
              );
            })}
          </div>
        ))}
      </TabsList>

      <button
        onClick={onToggleCollapsed}
        className="mx-3 mb-2 flex h-8 items-center justify-center gap-2 rounded-lg text-xs text-[#8ea3c9] hover:bg-white/5 hover:text-white"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /> Collapse</>}
      </button>

      <div className="mx-4 mb-7 border-t border-white/10 pt-5">
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e9a344] font-bold text-slate-900">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold">{userName}</p>
              <p className="text-xs text-[#8ea3c9]">{userRoleLabel}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
