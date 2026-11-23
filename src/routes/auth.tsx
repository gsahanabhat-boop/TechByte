import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Compass, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { safeRedirect, useAuth } from "@/lib/auth";
import { setGuest } from "@/lib/guest";
import { cn } from "@/lib/utils";
import yatri from "@/assets/yatri-avatar.png";
import loginBg from "@/assets/login-bg.jpg";

const REDIRECT_KEY = "tripsync:post-auth";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — TripSync AI" },
      {
        name: "description",
        content:
          "Sign in with Google or email to plan trips with TripSync AI and chat with Yatri, your travel assistant.",
      },
      { property: "og:title", content: "Sign in — TripSync AI" },
      {
        property: "og:description",
        content: "Sign in to plan trips and chat with TripSync AI's travel assistant.",
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

const AGENT_CHIPS = [
  ["Research", "bg-agent-research"],
  ["Budget", "bg-agent-budget"],
  ["Route", "bg-agent-route"],
  ["Decision", "bg-agent-decision"],
] as const;

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resending, setResending] = useState(false);

  const target = safeRedirect(
    search.redirect ??
      (typeof window !== "undefined" ? sessionStorage.getItem(REDIRECT_KEY) : null),
  );

  // Errors returned by Google or an expired confirmation link arrive in the URL.
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

  async function signInWithGoogle() {
    setError(null);
    setGoogleBusy(true);
    sessionStorage.setItem(REDIRECT_KEY, target);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth`,
    });
    if (result.error) {
      setGoogleBusy(false);
      toast.error("Google sign-in failed", { description: result.error.message });
    }
  }

  function continueAsGuest() {
    setGuest(true);
    void navigate({ to: "/", replace: true });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink text-ink-foreground">
      {/* Travel background */}
      <img
        src={loginBg}
        alt="Mysuru Palace across a lake at sunset, with palms and misty hills"
        className="absolute inset-0 size-full scale-105 object-cover object-[40%_center] motion-safe:animate-[login-drift_30s_ease-in-out_infinite_alternate]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/75 via-ink/20 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-ink/25" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 sm:px-10 sm:py-8">
        <Link
          to="/"
          onClick={() => setGuest(true)}
          className="flex w-fit items-center gap-2 rounded-full bg-ink/50 py-1.5 pl-1.5 pr-4 backdrop-blur-md"
        >
          <span className="grid size-9 place-items-center rounded-full bg-ink-foreground text-ink">
            <Compass className="size-5" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            TripSync <span className="text-marigold">AI</span>
          </span>
        </Link>

        <div className="grid flex-1 items-center gap-6 py-6 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:py-10">
          {/* Story */}
          <div className="max-w-xl animate-fade-up">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-marigold">
              Field journal · Karnataka
            </p>
            <h2 className="mt-2 text-4xl font-semibold leading-[1.02] lg:mt-3 lg:text-6xl">
              Every road,
              <br />
              <span className="italic text-marigold">planned for you.</span>
            </h2>
            <p className="mt-5 hidden max-w-md text-lg text-ink-foreground/85 lg:block">
              Four AI agents research, budget, route and personalise your trip — then Yatri
              answers every question along the way.
            </p>
            <div className="mt-6 hidden flex-wrap gap-2 lg:flex">
              {AGENT_CHIPS.map(([label, dot]) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-ink-foreground/25 bg-ink/40 px-3 py-1 text-xs font-semibold backdrop-blur"
                >
                  <span className={cn("size-2 rounded-full", dot)} /> {label}
                </span>
              ))}
            </div>
            <div className="mt-8 hidden max-w-sm items-center gap-4 rounded-2xl border border-ink-foreground/20 bg-ink/45 p-4 backdrop-blur-md lg:flex">
              <MapPin className="size-5 shrink-0 text-marigold" />
              <div className="flex-1 font-mono text-xs">
                <p className="text-ink-foreground/60">LAST PLANNED</p>
                <p className="mt-0.5 text-sm">Bengaluru → Mysuru · 2 days</p>
              </div>
              <span className="font-mono text-sm font-semibold text-marigold">₹5,000</span>
            </div>
          </div>

          {/* Sign-in card */}
          <div
            className="w-full max-w-md animate-fade-up justify-self-center lg:justify-self-end"
            style={{ animationDelay: "120ms" }}
          >
            <div className="rounded-3xl border border-ink-foreground/20 bg-card/90 p-7 text-card-foreground shadow-[var(--shadow-lift)] backdrop-blur-xl sm:p-8">
              <img src={yatri} alt="" width={56} height={56} className="hidden size-14 lg:block" />
              <h1 className="text-3xl font-semibold leading-tight lg:mt-4">
                {mode === "signin" ? "Welcome, traveller" : "Create your account"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in to save your chats with Yatri and pick up your plans on any device.
              </p>

              {sent ? (
                <div className="mt-6 space-y-3 rounded-xl bg-secondary p-4 text-center text-sm">
                  <p>
                    We sent a confirmation link to{" "}
                    <span className="font-semibold">{email}</span>. Open it to finish creating your
                    account — you'll be signed in automatically.
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
                  <Button
                    type="button"
                    variant="outline"
                    className="google-signin mt-5 h-11 w-full gap-2.5 font-medium"
                    disabled={googleBusy}
                    onClick={() => void signInWithGoogle()}
                  >
                    {googleBusy ? <Loader2 className="animate-spin" /> : <GoogleLogo />}
                    Continue with Google
                  </Button>
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
                        placeholder="you@example.com"
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
                        placeholder="At least 8 characters"
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
              <p className="mt-4 text-center text-sm text-muted-foreground">
                {mode === "signin" ? "New to TripSync?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setSent(false);
                    setError(null);
                    setUnconfirmed(false);
                  }}
                  className="font-semibold text-primary hover:underline"
                >
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </p>

              <div className="my-5 h-px bg-border" />

              <button
                type="button"
                onClick={continueAsGuest}
                className="group flex w-full items-center justify-between rounded-2xl border border-dashed border-border bg-background/60 px-5 py-4 text-left transition-colors hover:border-primary hover:bg-background"
              >
                <span>
                  <span className="block text-sm font-semibold">Continue as guest</span>
                  <span className="block text-xs text-muted-foreground">
                    Plan trips without an account — chat needs sign-in.
                  </span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </button>
            </div>
            <p className="mt-4 text-center text-xs text-ink-foreground/70">
              Your account only keeps your chat history with Yatri.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
