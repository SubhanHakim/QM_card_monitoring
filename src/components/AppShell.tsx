import { useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { userAuthStore } from "@/store/authStore";
import { BarChart3, ChevronsUpDown, FileText, LogOut, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

const NAV = [
  { label: "Daftar laporan", to: "/dashboard", icon: FileText },
  { label: "Rekap bulanan", to: "/rekap", icon: BarChart3 },
];

// Open-plane shell: sidebar on the page ground, no top bar on desktop.
// Phone: sidebar folds into a 48px bar whose menu holds the nav and account.
export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = userAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Collapsed state is a per-viewer convenience; storage may be unavailable.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar-collapsed") === "1";
    } catch {
      return false;
    }
  });
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem("sidebar-collapsed", c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  const isActive = (to: string) => pathname === to || pathname === `/ide${to}`;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const name = user?.name || "Petugas QM";
  const role = user?.role || "analis";

  return (
    <div className="flex min-h-screen w-full bg-[#f2f4f7] text-[#111] antialiased">
      {/* ─── SIDEBAR (desktop) ─── */}
      <aside className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[#e5e7eb] transition-[width] duration-200 md:flex ${collapsed ? "w-[60px]" : "w-64"}`}>
        <div className={`flex pb-4 pt-5 ${collapsed ? "flex-col items-center gap-3" : "items-center gap-2.5 px-5"}`}>
          <Mark />
          {!collapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[15px] font-medium tracking-tight">Quality Monitoring</p>
              <p className="text-xs text-[#5f6368]">IDE Stage</p>
            </div>
          )}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Buka sidebar" : "Tutup sidebar"}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#5f6368] transition-colors hover:bg-[#e9e9e9]/60 hover:text-[#111]"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" strokeWidth={1.5} /> : <PanelLeftClose className="h-4 w-4" strokeWidth={1.5} />}
          </button>
        </div>

        <nav className={`flex-1 px-3 ${collapsed ? "pt-2" : ""}`}>
          {!collapsed && <p className="px-2 pb-2 pt-4 text-xs text-[#5f6368]">Laporan</p>}
          <ul className="space-y-0.5">
            {NAV.map(({ label, to, icon: Icon }) => (
              <li key={to}>
                <button
                  type="button"
                  onClick={() => navigate(to)}
                  aria-current={isActive(to) ? "page" : undefined}
                  aria-label={label}
                  title={collapsed ? label : undefined}
                  className={`flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors ${collapsed ? "justify-center px-0" : ""} ${
                    isActive(to)
                      ? "bg-[#e9e9e9] font-medium"
                      : "text-[#5f6368] hover:bg-[#e9e9e9]/60 hover:text-[#111]"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                  {!collapsed && label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger title={collapsed ? name : undefined}
              className={`flex w-full cursor-pointer items-center gap-2.5 rounded-md p-2 text-left outline-none ${collapsed ? "justify-center" : ""} transition-colors hover:bg-[#e9e9e9]/60 focus-visible:ring-2 focus-visible:ring-[#003D79]`}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-[#e9e9e9] text-xs font-medium text-[#111]">
                  {name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-sm">{name}</span>
                    <span className="block text-xs capitalize text-[#5f6368]">{role}</span>
                  </span>
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[#5f6368]" />
                </>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-52 p-1.5">
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer gap-2.5 p-2 text-sm text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ─── TOP BAR (phone) ─── */}
        <header className="flex h-12 items-center justify-between border-b border-[#e5e7eb] px-4 md:hidden">
          <div className="flex items-center gap-2">
            <Mark size={20} />
            <span className="text-sm font-medium">Quality Monitoring</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Menu"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md outline-none hover:bg-[#e9e9e9]/60"
            >
              <Menu className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1.5">
              {NAV.map(({ label, to }) => (
                <DropdownMenuItem
                  key={to}
                  onClick={() => navigate(to)}
                  className={`cursor-pointer p-2.5 text-sm ${isActive(to) ? "font-medium" : ""}`}
                >
                  {label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer gap-2.5 p-2.5 text-sm text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Keluar ({name})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {children}
      </div>
    </div>
  );
}

function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="#003D79" strokeWidth="2" />
      <path d="M7.5 12.5l3 3 6-7" stroke="#003D79" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
