import { createFileRoute } from "@tanstack/react-router";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { SiteHeader } from "@/components/trip/SiteHeader";

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

function ChatPage() {
  const { user } = Route.useRouteContext();
  return (
    <div className="flex h-dvh flex-col">
      <SiteHeader />
      <ChatPanel userId={user.id} />
    </div>
  );
}
