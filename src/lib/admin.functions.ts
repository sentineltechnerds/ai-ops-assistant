import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============ User management (super admin only) ============

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  if (data?.role !== "super_admin") throw new Error("Forbidden: super admin only");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { data: profiles } = await supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: roles } = await supabaseAdmin.from("user_roles").select("*");
    const merged = (profiles ?? []).map(p => ({
      ...p,
      role: roles?.find(r => r.user_id === p.id)?.role ?? "employee",
    }));
    return { users: merged };
  });

function generateSecurePassword(length = 12): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*?";
  const all = upper + lower + digits + symbols;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const rest = Array.from({ length: Math.max(length - 4, 6) }, () => pick(all));
  return [...required, ...rest].sort(() => Math.random() - 0.5).join("");
}

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    fullName: z.string().trim().min(1).max(120),
    email: z.string().email().max(200),
    department: z.enum(["HR", "IT", "Finance"]),
    role: z.enum(["employee", "department_admin"]),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const email = data.email.trim().toLowerCase();

    // 1. Source of truth: does a profile already exist for this email?
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles").select("id").eq("email", email).maybeSingle();
    if (existingProfile) {
      throw new Error(`An active user already exists with ${email}.`);
    }

    // 2. Clean up any orphan auth.users row that no longer has a profile.
    //    (Failed prior creations or manually deleted profiles leave these behind
    //     and cause "User already registered" errors on retry.)
    try {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const orphan = list?.users?.find(u => (u.email ?? "").toLowerCase() === email);
      if (orphan) {
        await supabaseAdmin.auth.admin.deleteUser(orphan.id);
      }
    } catch { /* non-fatal — fall through to create */ }

    const password = generateSecurePassword(12);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: data.fullName, department: data.department, role: data.role },
    });
    if (error) throw new Error(error.message);
    if (created.user) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: created.user.id, role: data.role }, { onConflict: "user_id,role" });
      await supabaseAdmin.from("profiles").update({
        full_name: data.fullName, department: data.department,
      }).eq("id", created.user.id);
    }
    return { ok: true, email, password };
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    userId: z.string().uuid(),
    isActive: z.boolean(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.from("profiles").update({ is_active: data.isActive }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    // Also ban/unban auth user
    await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.isActive ? "none" : "876000h",
    });
    return { ok: true };
  });

// ============ Notifications ============

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30);
    return { notifications: data ?? [] };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await context.supabase.from("notifications").update({ is_read: true }).eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    return { ok: true };
  });
