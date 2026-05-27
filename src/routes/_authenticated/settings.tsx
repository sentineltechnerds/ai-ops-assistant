import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Aurora" }] }),
  component: Settings,
});

function Settings() {
  const { user, role } = useAuth();
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <div className="glass rounded-3xl p-6 space-y-3">
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Email</span><span className="font-medium">{user?.email}</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Role</span><span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-semibold uppercase">{role}</span></div>
      </div>
    </div>
  );
}
