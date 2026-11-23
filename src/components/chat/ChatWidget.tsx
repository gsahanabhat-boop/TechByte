import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Maximize2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import yatri from "@/assets/yatri-avatar.png";
import { ChatPanel } from "./ChatPanel";

/** Floating "Ask Yatri" button shown on every page except the full chat and sign-in pages. */
export function ChatWidget() {
  const { user, loading } = useAuth();
  const { pathname, href } = useLocation();
  const [open, setOpen] = useState(false);
  if (pathname.startsWith("/chat") || pathname.startsWith("/auth")) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Chat with Yatri, your travel assistant"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-ink py-1.5 pl-1.5 pr-4 text-ink-foreground shadow-lift transition-transform hover:-translate-y-0.5 animate-fade-up"
        >
          <span className="grid size-10 place-items-center rounded-full bg-card">
            <img src={yatri} alt="" width={36} height={36} className="size-9" />
          </span>
          <span className="text-sm font-semibold">Ask Yatri</span>
        </button>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md [&>button]:hidden"
        >
          <SheetTitle className="sr-only">Chat with Yatri</SheetTitle>
          <SheetDescription className="sr-only">
            Ask TripSync AI's travel assistant anything about your trip.
          </SheetDescription>
          <div className="absolute right-3 top-3 z-10 flex gap-1">
            {user && (
              <Button variant="ghost" size="icon-sm" asChild aria-label="Open full chat page">
                <Link to="/chat" onClick={() => setOpen(false)}>
                  <Maximize2 />
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              <X />
            </Button>
          </div>
          {loading ? null : user ? (
            <ChatPanel userId={user.id} compact />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <img src={yatri} alt="" width={96} height={96} className="size-24" />
              <div>
                <h2 className="text-2xl font-semibold">Meet Yatri</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your travel assistant for places, budgets, routes and food. Sign in so your chat
                  is saved on every device.
                </p>
              </div>
              <Button variant="hero" size="lg" className="rounded-full" asChild>
                <Link to="/auth" search={{ redirect: href }} onClick={() => setOpen(false)}>
                  Sign in to chat
                </Link>
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
