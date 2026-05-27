import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutDashboard, PlusCircle, History, BarChart3, ListChecks, Settings, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  component: Layout,
});

const nav = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/submit", icon: PlusCircle, label: "Submit Ticket" },
  { to: "/tickets", icon: History, label: "Ticket History" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/queue", icon: ListChecks, label: "Priority Queue" },
  { to: "/settings", icon: Settings, label: "Settings" },
] as const;

function Layout() {
  const { session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login", replace: true });
  }, [session, loading, navigate]);

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading workspace…</div>;
  }

  return (
    <div className="min-h-screen flex">
      <aside className={`${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static z-40 inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border p-5 flex flex-col transition-transform`}>
        <div className="mb-8"><Logo /></div>
        <nav className="space-y-1 flex-1">
          {nav.map(n => {
            const active = loc.pathname === n.to;
            return (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}>
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={() => signOut().then(() => navigate({ to: "/" }))} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </aside>
      <div className="flex-1 lg:ml-0 min-w-0">
        <div className="lg:hidden p-4 border-b border-border flex items-center justify-between">
          <Logo />
          <button onClick={() => setOpen(!open)} className="p-2 rounded-lg bg-secondary"><Menu className="h-4 w-4" /></button>
        </div>
        <main className="p-6 md:p-10 max-w-7xl mx-auto"><Outlet /></main>
      </div>
    </div>
  );
}
