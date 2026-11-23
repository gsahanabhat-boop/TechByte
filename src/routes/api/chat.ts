import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";

const MODEL = "google/gemini-3.8-flash" as const;

const bodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  trips: z.string().max(6000).optional(),
});

const SYSTEM = `You are Yatri, the friendly travel assistant inside TripSync AI — an app where four agents (research, budget, route, decision) plan trips.
Help with destinations, itineraries, budgets, transport, food, packing, safety and local tips. Default to India and Indian Rupees (₹) unless the user says otherwise.
Be concise and practical: short paragraphs, bullet lists, realistic prices. Use real place names. When helpful, suggest the user run the TripSync planner on the home page for a full plan.
If you are unsure about timings or prices, say so.`;

function userClient(token: string) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Backend is not configured");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers
          .get("authorization")
          ?.replace(/^Bearer\s+/i, "")
          .trim();
        if (!token) return new Response("Sign in required", { status: 401 });
        const supabase = userClient(token);
        const { data: userData, error: userError } = await supabase.auth.getUser(token);
        const user = userData.user;
        if (userError || !user) return new Response("Sign in required", { status: 401 });

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid message", { status: 400 });
        const { message, trips } = parsed.data;

        const { error: insertError } = await supabase
          .from("chat_messages")
          .insert({ user_id: user.id, role: "user", content: message });
        if (insertError) {
          console.error("[chat] save user message", insertError);
          return new Response("Could not save your message", { status: 500 });
        }

        const { data: rows, error: historyError } = await supabase
          .from("chat_messages")
          .select("role, content")
          .order("created_at", { ascending: false })
          .limit(30);
        if (historyError) console.error("[chat] load history", historyError);
        const history = (rows ?? []).reverse().map((r) => ({
          role: r.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: r.content,
        }));

        const system = trips
          ? `${SYSTEM}\n\nThe user's saved TripSync trips (may reference them):\n${trips}`
          : SYSTEM;

        const stream = createUIMessageStream({
          execute: async ({ writer }) => {
            const { streamChatCompletion } = await import("@lovable.dev/ai-gateway");
            const events = await streamChatCompletion({
              model: MODEL,
              messages: [{ role: "system", content: system }, ...history],
            });
            const id = crypto.randomUUID();
            let full = "";
            writer.write({ type: "text-start", id });
            for await (const ev of events) {
              const delta = ev.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta) {
                full += delta;
                writer.write({ type: "text-delta", id, delta });
              }
            }
            writer.write({ type: "text-end", id });
            if (full.trim()) {
              const { error } = await supabase
                .from("chat_messages")
                .insert({ user_id: user.id, role: "assistant", content: full.slice(0, 20000) });
              if (error) console.error("[chat] save assistant message", error);
            }
          },
          onError: (err) => {
            console.error("[chat] stream", err);
            return "Yatri couldn't answer just now. Please try again in a moment.";
          },
        });
        return createUIMessageStreamResponse({ stream });
      },
    },
  },
});
