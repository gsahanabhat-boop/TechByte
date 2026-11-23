import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, loading: true });

/** Single app-wide auth listener: keeps the session in context and refreshes routes on sign-in/out. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    void supabase.auth
      .getSession()
      .then(({ data }) => setState({ user: data.session?.user ?? null, loading: false }));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setState({ user: session?.user ?? null, loading: false });
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void router.invalidate();
      if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** Only allow same-origin relative paths as post-login destinations. */
export function safeRedirect(value: unknown, fallback = "/chat"): string {
  if (typeof value !== "string") return fallback;
  try {
    const url = new URL(value, "http://x");
    if (url.origin !== "http://x") {
      if (typeof window !== "undefined" && url.origin === window.location.origin)
        return url.pathname + url.search;
      return fallback;
    }
    return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
  } catch {
    return fallback;
  }
}
