import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, Search, Power, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listUsers, createUser, setUserActive } from "@/lib/admin.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "User Management — Aurora" }] }),
  component: Users,
});

function Users() {
  const { role } = useAuth();
  const listFn = useServerFn(listUsers);
  const createFn = useServerFn(createUser);
  const toggleFn = useServerFn(setUserActive);
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["users"], queryFn: () => listFn(), enabled: role === "super_admin",
  });
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ fullName: "", email: "", department: "IT" as "HR"|"IT"|"Finance", role: "employee" as "employee"|"department_admin" });
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  if (role !== "super_admin") return <div className="text-sm text-muted-foreground">Access denied.</div>;

  const users = (data?.users ?? []).filter(u =>
    q === "" || u.full_name?.toLowerCase().includes(q.toLowerCase()) || u.email?.toLowerCase().includes(q.toLowerCase())
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await createFn({ data: form });
      setCredentials({ email: res.email, password: res.password });
      setOpen(false);
      setForm({ fullName: "", email: "", department: "IT", role: "employee" });
      refetch();
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Provision accounts and assign department roles.</p>
        </div>
        <button onClick={() => setOpen(true)} className="bg-gradient-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-2 shadow-glow">
          <UserPlus className="h-4 w-4" /> Create user
        </button>
      </header>

      <div className="glass rounded-2xl p-3 flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground ml-2" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search users…" className="flex-1 bg-transparent text-sm outline-none py-2" />
      </div>

      <div className="glass rounded-3xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Email</th><th className="text-left p-3">Department</th><th className="text-left p-3">Role</th><th className="text-left p-3">Status</th><th className="text-right p-3">Actions</th></tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading…</td></tr> :
             users.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No users found.</td></tr> :
             users.map(u => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3 font-medium">{u.full_name || "—"}</td>
                <td className="p-3 text-muted-foreground">{u.email}</td>
                <td className="p-3"><span className="text-xs px-2 py-1 rounded-full bg-secondary">{u.department}</span></td>
                <td className="p-3 text-xs uppercase tracking-wider font-semibold">{u.role}</td>
                <td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${u.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{u.is_active ? "Active" : "Disabled"}</span></td>
                <td className="p-3 text-right">
                  <button onClick={async () => { await toggleFn({ data: { userId: u.id, isActive: !u.is_active } }); toast.success("Updated"); refetch(); }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70">
                    <Power className="h-3 w-3" /> {u.is_active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <motion.form initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()} onSubmit={submit}
            className="glass rounded-3xl p-6 w-full max-w-md space-y-3 shadow-glow">
            <h2 className="font-display text-xl font-bold">Create user</h2>
            <input required placeholder="Full name" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="w-full rounded-xl bg-card border border-border px-4 py-2.5 text-sm" />
            <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl bg-card border border-border px-4 py-2.5 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value as any })} className="rounded-xl bg-card border border-border px-3 py-2.5 text-sm">
                {["HR","IT","Finance"].map(d => <option key={d}>{d}</option>)}
              </select>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as any })} className="rounded-xl bg-card border border-border px-3 py-2.5 text-sm">
                <option value="employee">Employee</option>
                <option value="department_admin">Department Admin</option>
              </select>
            </div>
            <p className="text-[11px] text-muted-foreground px-1">A secure temporary password will be generated and shown after the account is created.</p>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-medium">Cancel</button>
              <button disabled={busy} className="flex-1 bg-gradient-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create
              </button>
            </div>
          </motion.form>
        </div>
      )}

      {credentials && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setCredentials(null)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()}
            className="glass rounded-3xl p-6 w-full max-w-md space-y-4 shadow-glow">
            <h2 className="font-display text-xl font-bold">Account created</h2>
            <p className="text-xs text-muted-foreground">Share these credentials securely. The password is shown only once.</p>
            <div className="space-y-2">
              <div className="rounded-xl bg-card border border-border px-4 py-2.5 text-sm font-mono break-all">{credentials.email}</div>
              <div className="rounded-xl bg-card border border-border px-4 py-2.5 text-sm font-mono break-all">{credentials.password}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`); toast.success("Copied"); }}
                className="flex-1 bg-gradient-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold">Copy credentials</button>
              <button onClick={() => setCredentials(null)} className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-medium">Done</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
