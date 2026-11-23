import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/trip/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { safeRedirect, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import yatri from "@/assets/yatri-avatar.png";

const REDIRECT_KEY = "tripsync:post-auth";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — TripSync AI" },
      {
        name: "description",
        content:
          "Sign in to chat with Yatri, TripSync AI's travel assistant, and keep your conversation across devices.",
      },
      { property: "og:title", content: "Sign in — TripSync AI" },
      {
        property: "og:description",
        content: "Sign in to chat with TripSync AI's travel assistant.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const credsSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
});

function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px]">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resending, setResending] = useState(false);

  const target = safeRedirect(
    search.redirect ??
      (typeof window !== "undefined" ? sessionStorage.getItem(REDIRECT_KEY) : null),
  );

  // Errors returned by a provider or an expired confirmation link arrive in the URL.
  useEffect(() => {
    const params = new URLSearchParams(
      window.location.hash.slice(1) || window.location.search.slice(1),
    );
    const desc = params.get("error_description");
    if (desc) setError(desc.replace(/\+/g, " "));
  }, []);

  useEffect(() => {
    if (user) {
      sessionStorage.removeItem(REDIRECT_KEY);
      void navigate({ to: target, replace: true });
    }
  }, [user, navigate, target]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnconfirmed(false);
    const parsed = credsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setBusy(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) {
        if (error.code === "email_not_confirmed") {
          setUnconfirmed(true);
          setError("Please confirm your email first — check your inbox for the link.");
        } else if (error.code === "invalid_credentials") {
          setError("That email and password don't match. Try again or create an account.");
        } else setError(error.message);
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        ...parsed.data,
        options: { emailRedirectTo: confirmRedirect() },
      });
      if (error) setError(error.message);
      else if (data.user && data.user.identities?.length === 0)
        setError("An account with this email already exists. Sign in instead.");
      else if (!data.session) setSent(true);
    }
    setBusy(false);
  }

  function confirmRedirect() {
    return `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}`;
  }

  async function resend() {
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: confirmRedirect() },
    });
    setResending(false);
    if (error) toast.error("Couldn't resend the email", { description: error.message });
    else toast.success("Confirmation email sent", { description: `Check ${email.trim()}` });
  }

  async function social(provider: "google" | "lovable") {
    setError(null);
    sessionStorage.setItem(REDIRECT_KEY, target);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/auth`,
    });
    if (result.error) {
      toast.error("Sign-in failed", { description: result.error.message });
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="topo flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="journal-card w-full max-w-md p-7 sm:p-8">
          <img src={yatri} alt="" width={64} height={64} className="mx-auto size-16" />
          <h1 className="mt-4 text-center text-3xl font-semibold">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Sign in to chat with Yatri and keep your conversation on every device.
          </p>

          {sent ? (
            <div className="mt-6 space-y-3 rounded-xl bg-secondary p-4 text-center text-sm">
              <p>
                We sent a confirmation link to <span className="font-semibold">{email}</span>.
                Open it to finish creating your account — you'll be signed in automatically.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={resending}
                onClick={() => void resend()}
              >
                {resending && <Loader2 className="animate-spin" />}
                Resend email
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-6 space-y-2.5">
                <Button
                  type="button"
                  variant="outline"
                  className="google-signin h-11 w-full font-medium"
                  onClick={() => void social("google")}
                >
                  <GoogleLogo /> Continue with Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  onClick={() => void social("lovable")}
                >
                  <LovableMark className="size-[18px]" /> Continue with Lovable
                </Button>
              </div>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or with email{" "}
                <span className="h-px flex-1 bg-border" />
              </div>
              <form onSubmit={submit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-background"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {unconfirmed && (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0"
                    disabled={resending}
                    onClick={() => void resend()}
                  >
                    Resend confirmation email
                  </Button>
                )}
                <Button type="submit" className="h-11 w-full" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>
            </>
          )}
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to TripSync?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setSent(false);
                setError(null);
                setUnconfirmed(false);
              }}
              className={cn("font-semibold text-primary hover:underline")}
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
