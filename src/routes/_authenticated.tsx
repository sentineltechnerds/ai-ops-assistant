import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, PlusCircle, History, ListChecks, LogOut, Menu, Users, Shield, BarChart3 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";

export const Route = createFileRoute("/_authenticated")({
  component: Layout,
});

function Layout() {
  const { session, loading, role, signOut, fullName } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login", replace: true });
  }, [session, loading, navigate]);

  // Employees never see the admin dashboard — bounce them to their tickets.
  useEffect(() => {
    if (!loading && session && role === "employee" && loc.pathname === "/dashboard") {
      navigate({ to: "/tickets", replace: true });
    }
  }, [role, loading, session, loc.pathname, navigate]);

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading workspace…</div>;
  }

  // Build nav by role
  const baseNav: { to: string; icon: any; label: string }[] = [];
  if (role === "super_admin") {
    baseNav.push(
      { to: "/dashboard", icon: Shield, label: "Command Center" },
      { to: "/users", icon: Users, label: "User Management" },
      { to: "/tickets", icon: History, label: "All Tickets" },
    );
  } else if (role === "department_admin") {
    baseNav.push(
      { to: "/queue", icon: ListChecks, label: "Department Queue" },
      { to: "/tickets", icon: History, label: "Ticket History" },
    );
  } else {
    baseNav.push(
      { to: "/tickets", icon: History, label: "My Tickets" },
      { to: "/submit", icon: PlusCircle, label: "Submit Ticket" },
    );
  }

  const roleLabel =
    role === "super_admin" ? "Super Admin" :
    role === "department_admin" ? "Dept Admin" : "Employee";

  return (
    <div className="min-h-screen flex">
      <aside className={`${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static z-40 inset-y-0 left-0 w-64 bg-sidebar border-r border-sidebar-border p-5 flex flex-col transition-transform`}>
        <div className="mb-6"><Logo /></div>
        <div className="mb-6 glass rounded-2xl px-3 py-2.5 text-xs">
          <div className="font-semibold truncate">{fullName ?? "User"}</div>
          <div className="text-muted-foreground mt-0.5">{roleLabel}</div>
        </div>
        <nav className="space-y-1 flex-1">
          {baseNav.map(n => {
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
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="lg:hidden"><Logo /></div>
          <div className="lg:ml-auto flex items-center gap-3">
            <NotificationBell />
            <button onClick={() => setOpen(!open)} className="lg:hidden p-2 rounded-lg bg-secondary"><Menu className="h-4 w-4" /></button>
          </div>
        </div>
        <main className="p-6 md:p-10 max-w-7xl mx-auto"><Outlet /></main>
      </div>
    </div>
  );
}
