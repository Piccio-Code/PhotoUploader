import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Image as ImageIcon, Grid, Users, Bell, Settings, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { useAuth } from "../lib/auth";

export default function Layout() {
  const { user, role, isAdmin, logout } = useAuth();

  const navItems: { to: string; icon: ReactNode; label: string; adminOnly?: boolean }[] = [
    { to: "/", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
    { to: "/photos", icon: <ImageIcon size={18} />, label: "Photos" },
    { to: "/sections", icon: <Grid size={18} />, label: "Sections", adminOnly: true },
    { to: "/users", icon: <Users size={18} />, label: "Users", adminOnly: true },
  ];

  const roleBadge = role === "admin"
    ? { text: "Admin", cls: "bg-amber-100 text-amber-900" }
    : role === "editor"
      ? { text: "Editor", cls: "bg-teal-100 text-teal-900" }
      : { text: "Utente", cls: "bg-stone-200 text-stone-700" };

  return (
    <div className="min-h-screen flex bg-surface">
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-outline-variant/20 bg-surface-container-low flex flex-col z-40">
        <div className="p-6 flex items-center gap-3">
          <img src="/logo.png" alt="Ginella" className="w-11 h-11 rounded-lg object-contain" />
          <div>
            <h1 className="text-xl font-bold text-primary">Ginella</h1>
            <p className="text-[10px] text-outline uppercase tracking-widest font-bold">Gestionale</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => (
              <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} />
            ))}
        </nav>

        <div className="p-6 mt-auto border-t border-outline-variant/20">
          <div className="flex items-center gap-3">
            <img
              src={user?.photoURL ?? "https://i.pravatar.cc/150?u=admin"}
              alt="Profile"
              className="w-10 h-10 rounded-full border-2 border-primary/10 object-cover"
            />
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate">
                {user?.displayName ?? "Utente"}
              </p>
              <p className="text-[10px] text-outline uppercase font-bold truncate">
                {user?.email ?? "—"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 w-full z-30 flex justify-between items-center px-8 py-4 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10">
          <div className="flex items-center gap-8 flex-1">
            <h2 className="text-2xl font-headline font-extrabold text-primary tracking-tight">
              Gestione
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <span className={`${roleBadge.cls} px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider`}>
              {roleBadge.text}
            </span>
            <div className="flex items-center gap-4 text-outline">
              <button className="hover:text-primary transition-colors"><Bell size={20} /></button>
              <button className="hover:text-primary transition-colors"><Settings size={20} /></button>
              <div className="h-6 w-px bg-outline-variant/30" />
              <button
                type="button"
                onClick={() => logout()}
                className="text-sm font-bold text-error hover:opacity-80 transition-opacity flex items-center gap-2"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150",
          isActive
            ? "text-primary font-bold border-r-4 border-primary bg-primary/5 scale-[0.98]"
            : "text-outline hover:text-primary hover:bg-primary/5 font-medium",
        )
      }
    >
      {icon}
      <span className="text-xs tracking-wider uppercase">{label}</span>
    </NavLink>
  );
}
