import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Compass, LogOut, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function SiteHeader() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-full bg-ink text-ink-foreground">
            <Compass className="size-5" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            TripSync <span className="text-accent">AI</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <a
            href="/#planner"
            className="rounded-full px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            Planner
          </a>
          <a
            href="/#how"
            className="hidden rounded-full px-3 py-2 text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            How it works
          </a>
          <Link
            to="/history"
            className="rounded-full px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "rounded-full px-3 py-2 bg-secondary text-foreground" }}
          >
            My trips
          </Link>
          <Link
            to="/chat"
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{
              className:
                "flex items-center gap-1.5 rounded-full px-3 py-2 bg-secondary text-foreground",
            }}
          >
            <MessageCircle className="size-4" /> <span className="hidden sm:inline">Chat</span>
          </Link>
          {!loading &&
            (user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void signOut()}
                title={user.email ?? "Signed in"}
                className="rounded-full"
              >
                <LogOut /> <span className="hidden sm:inline">Sign out</span>
              </Button>
            ) : (
              <Button variant="ink" size="sm" asChild className="ml-1 rounded-full">
                <Link to="/auth">Sign in</Link>
              </Button>
            ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-ink text-ink-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-display text-lg">TripSync AI</p>
        <p className="opacity-70">
          Four Gemini-powered agents, one orchestrator, zero planning stress.
        </p>
      </div>
    </footer>
  );
}
