import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/trip/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { buildTripContext } from "@/lib/trip/chat-context";
import yatri from "@/assets/yatri-avatar.png";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Chat with Yatri — TripSync AI" },
      {
        name: "description",
        content:
          "Ask TripSync AI's travel assistant about destinations, budgets, routes and packing.",
      },
      { property: "og:title", content: "Chat with Yatri — TripSync AI" },
      {
        property: "og:description",
        content: "Your AI travel assistant for trips across India and beyond.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatPage,
});

const SUGGESTIONS = [
  "Plan a weekend from Bengaluru under ₹5,000",
  "What should I eat in Mysuru?",
  "Packing list for Coorg in the monsoon",
  "Is a train or bus better from Bengaluru to Mysuru?",
];

function ChatPage() {
  const [initial, setInitial] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    void supabase
      .from("chat_messages")
      .select("id, role, content")
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data, error }) => {
        if (error) toast.error("Couldn't load your chat", { description: error.message });
        setInitial(
          (data ?? []).map((r) => ({
            id: r.id,
            role: r.role === "assistant" ? "assistant" : "user",
            parts: [{ type: "text", text: r.content }],
          })),
        );
      });
  }, []);

  return (
    <div className="flex h-dvh flex-col">
      <SiteHeader />
      {initial ? (
        <ChatWindow initial={initial} />
      ) : (
        <div className="grid flex-1 place-items-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      )}
    </div>
  );
}

function ChatWindow({ initial }: { initial: UIMessage[] }) {
  const { user } = Route.useRouteContext();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [clearing, setClearing] = useState(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages }) => {
          const { data } = await supabase.auth.getSession();
          const last = messages[messages.length - 1];
          const text = (last?.parts ?? []).map((p) => (p.type === "text" ? p.text : "")).join("");
          return {
            headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}` },
            body: { message: text, trips: buildTripContext() },
          };
        },
      }),
    [],
  );

  const { messages, sendMessage, status, setMessages, stop, error } = useChat({
    messages: initial,
    transport,
  });

  useEffect(() => {
    if (status === "ready" || status === "error") inputRef.current?.focus();
  }, [status]);

  useEffect(() => {
    if (error)
      toast.error("Yatri couldn't reply", { description: "Please try again in a moment." });
  }, [error]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || status === "submitted" || status === "streaming") return;
    void sendMessage({ text: t });
  };

  async function newChat() {
    setClearing(true);
    stop();
    const { error } = await supabase.from("chat_messages").delete().eq("user_id", user.id);
    setClearing(false);
    if (error) {
      toast.error("Couldn't clear the chat", { description: error.message });
      return;
    }
    setMessages([]);
    inputRef.current?.focus();
  }

  const lastIsUser = messages[messages.length - 1]?.role === "user";

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 sm:px-6">
      <div className="flex items-center justify-between gap-3 border-b border-border py-3">
        <div className="flex items-center gap-3">
          <img src={yatri} alt="Yatri" width={44} height={44} className="size-11" />
          <div>
            <p className="font-display text-lg font-semibold leading-tight">Yatri</p>
            <p className="text-xs text-muted-foreground">
              Your TripSync travel assistant · knows your saved trips
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void newChat()}
          disabled={clearing || messages.length === 0}
        >
          {clearing ? <Loader2 className="animate-spin" /> : <RotateCcw />} New chat
        </Button>
      </div>

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-6 py-6">
          {messages.length === 0 ? (
            <ConversationEmptyState>
              <img src={yatri} alt="" width={96} height={96} className="size-24" />
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold">Where to next?</h2>
                <p className="text-sm text-muted-foreground">
                  Ask about places, budgets, routes, food or packing.
                </p>
              </div>
              <div className="mt-2 flex max-w-xl flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm transition-colors hover:border-primary/50 hover:bg-secondary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => (
              <Message key={m.id} from={m.role}>
                <MessageContent className="group-[.is-user]:rounded-2xl group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground group-[.is-assistant]:text-[0.95rem] group-[.is-assistant]:leading-relaxed">
                  {m.parts.map((p, i) =>
                    p.type === "text" ? (
                      m.role === "assistant" ? (
                        <MessageResponse key={i}>{p.text}</MessageResponse>
                      ) : (
                        <p key={i} className="whitespace-pre-wrap">
                          {p.text}
                        </p>
                      )
                    ) : null,
                  )}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && lastIsUser && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Yatri is thinking…</Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="pb-4 pt-2">
        <PromptInput
          onSubmit={(msg: PromptInputMessage) => send(msg.text)}
          className="rounded-2xl bg-card shadow-card"
        >
          <PromptInputTextarea
            ref={inputRef}
            autoFocus
            placeholder="Ask Yatri about your next trip…"
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Yatri can make mistakes — double-check timings and prices.
        </p>
      </div>
    </main>
  );
}
