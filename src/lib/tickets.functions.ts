import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";



const KEYWORDS: Record<string, string[]> = {
  HR: ["leave", "salary", "recruit", "benefit", "onboard", "payroll", "employee", "resign", "hr", "holiday", "vacation"],
  IT: ["laptop", "password", "email", "software", "vpn", "internet", "network", "server", "access", "login", "wifi", "computer", "outage", "system down"],
  Finance: ["invoice", "reimburse", "payment", "budget", "supplier", "purchase", "expense", "claim", "finance", "accounting", "refund"],
  Operations: ["facility", "facilities", "office", "logistics", "shipment", "warehouse", "delivery", "operations", "maintenance", "equipment", "vendor", "inventory", "supply chain", "procurement"],
};

const CRITICAL_WORDS = ["server down", "server is offline", "offline", "outage", "cannot access payroll", "payroll down", "system down", "critical", "urgent", "emergency", "breach", "data loss", "production down"];
const HIGH_WORDS = ["cannot connect", "cannot access", "blocked", "broken", "asap", "important", "stuck", "failing", "not working"];
const LOW_WORDS = ["request", "supplies", "schedule", "info", "stationery", "general inquiry"];

type Cat = "HR" | "IT" | "Finance" | "Operations";

function keywordClassify(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();
  const scores: Record<string, number> = { HR: 0, IT: 0, Finance: 0, Operations: 0 };
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    for (const w of words) if (text.includes(w)) scores[cat]++;
  }
  let best: Cat = "IT";
  let max = 0;
  for (const [cat, s] of Object.entries(scores)) {
    if (s > max) { max = s; best = cat as Cat; }
  }
  let priority: "low" | "medium" | "high" | "critical" = "medium";
  if (CRITICAL_WORDS.some(w => text.includes(w))) priority = "critical";
  else if (HIGH_WORDS.some(w => text.includes(w))) priority = "high";
  else if (LOW_WORDS.some(w => text.includes(w))) priority = "low";

  const confidence = Math.min(0.6 + max * 0.08, 0.85);
  return {
    category: best,
    priority,
    confidence,
    summary: `${best} request: ${title.slice(0, 90)}`,
    fallback: true,
  };
}

async function aiClassify(title: string, description: string) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return keywordClassify(title, description);

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an enterprise operations AI that classifies internal employee support requests and assigns urgency based on operational impact, business interruption risk, and severity. Critical = system outages, payroll failures, security breaches. High = blocked work, broken access. Medium = standard requests. Low = informational or supplies. Respond by calling classify_ticket." },
          { role: "user", content: `Title: ${title}\nDescription: ${description}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_ticket",
            description: "Classify a support ticket and determine urgency",
            parameters: {
              type: "object",
              properties: {
                category: { type: "string", enum: ["HR", "IT", "Finance", "Operations"] },
                priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
                confidence: { type: "number", description: "0 to 1" },
                summary: { type: "string", description: "1-2 sentence summary for ops manager" },
              },
              required: ["category", "priority", "confidence", "summary"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify_ticket" } },
      }),
    });

    if (!res.ok) {
      console.error("AI gateway error", res.status);
      return keywordClassify(title, description);
    }
    const data = await res.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return keywordClassify(title, description);
    const parsed = JSON.parse(args);
    return {
      category: parsed.category as Cat,
      priority: parsed.priority as "low" | "medium" | "high" | "critical",
      confidence: Number(parsed.confidence) || 0.75,
      summary: String(parsed.summary || "").slice(0, 300),
      fallback: false,
    };
  } catch (e) {
    console.error("AI classify failed", e);
    return keywordClassify(title, description);
  }
}

const queueMap: Record<string, string> = {
  HR: "HR Queue",
  IT: "IT Support Queue",
  Finance: "Finance Approval Queue",
  Operations: "Operations Queue",
};

export const submitTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    title: z.string().trim().min(3).max(150),
    description: z.string().trim().min(5).max(2000),
    employeeName: z.string().trim().min(1).max(120),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const ai = await aiClassify(data.title, data.description);
    const { supabase, userId } = context;
    // AI-determined category becomes the owning department.
    // AI-determined priority is authoritative (employee no longer chooses).
    const { data: row, error } = await supabase.from("tickets").insert({
      employee_id: userId,
      employee_name: data.employeeName,
      department: ai.category,
      title: data.title,
      description: data.description,
      priority: ai.priority,
      ai_suggested_priority: ai.priority,
      predicted_category: ai.category,
      confidence_score: ai.confidence,
      ai_summary: ai.summary,
      ai_fallback: ai.fallback,
      assigned_queue: queueMap[ai.category],
      status: "new",
    }).select("*").single();
    if (error) throw new Error(error.message);
    return { ticket: row };
  });

export const listMyTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("tickets").select("*")
      .eq("employee_id", userId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { tickets: data ?? [] };
  });

export const listAllTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.from("tickets").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { tickets: data ?? [] };
  });

export const updateTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    id: z.string().uuid(),
    status: z.enum(["new", "in_progress", "escalated", "resolved"]),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("tickets").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
