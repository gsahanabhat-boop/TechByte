import { useState } from "react";
import {
  Loader2,
  MapPin,
  Navigation,
  Sparkles,
  Users,
  Wallet,
  CalendarDays,
  FlaskConical,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  DEMO_INPUT,
  INTERESTS,
  TRAVEL_STYLES,
  tripInputSchema,
  type TripInput,
} from "@/lib/trip/types";

interface Props {
  running: boolean;
  onSubmit: (trip: TripInput, opts: { demo: boolean }) => void;
}

type Draft = Omit<TripInput, "days" | "budget" | "travelers"> & {
  days: string;
  budget: string;
  travelers: string;
};

const toDraft = (t: TripInput): Draft => ({
  ...t,
  days: String(t.days),
  budget: String(t.budget),
  travelers: String(t.travelers),
});

export function TripForm({ running, onSubmit }: Props) {
  const [draft, setDraft] = useState<Draft>(toDraft(DEMO_INPUT));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [demo, setDemo] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const toggleInterest = (i: string) =>
    set(
      "interests",
      draft.interests.includes(i)
        ? draft.interests.filter((x) => x !== i)
        : [...draft.interests, i],
    );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = tripInputSchema.safeParse(draft);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((iss) => {
        const k = String(iss.path[0]);
        if (!errs[k]) errs[k] = iss.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    onSubmit(parsed.data, { demo });
  }

  const field = (
    key: keyof Draft,
    label: string,
    icon: React.ReactNode,
    props: React.ComponentProps<typeof Input>,
  ) => (
    <div className="space-y-1.5">
      <Label
        htmlFor={key}
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <Input
          id={key}
          value={String(draft[key])}
          onChange={(e) => set(key, e.target.value as never)}
          className={cn("h-11 bg-background pl-9", errors[key] && "border-destructive")}
          {...props}
        />
      </div>
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="journal-card space-y-6 p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Plan a trip</h2>
          <p className="text-sm text-muted-foreground">
            Pre-filled with the Bengaluru → Mysuru demo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDraft(toDraft(DEMO_INPUT))}
          className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          Reset demo
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {field("origin", "From", <Navigation className="size-4" />, { placeholder: "Bengaluru" })}
        {field("destination", "To", <MapPin className="size-4" />, { placeholder: "Mysuru" })}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {field("days", "Days", <CalendarDays className="size-4" />, {
          type: "number",
          min: 1,
          max: 14,
          inputMode: "numeric",
        })}
        {field("budget", "Budget ₹", <Wallet className="size-4" />, {
          type: "number",
          min: 500,
          step: 100,
          inputMode: "numeric",
        })}
        {field("travelers", "People", <Users className="size-4" />, {
          type: "number",
          min: 1,
          max: 20,
          inputMode: "numeric",
        })}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Interests
        </Label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const on = draft.interests.includes(i);
            return (
              <button
                type="button"
                key={i}
                onClick={() => toggleInterest(i)}
                aria-pressed={on}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm transition-all",
                  on
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background hover:border-primary/50",
                )}
              >
                {i}
              </button>
            );
          })}
        </div>
        {errors["interests"] && <p className="text-xs text-destructive">{errors["interests"]}</p>}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Travel style
        </Label>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:grid-cols-4">
          {TRAVEL_STYLES.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => set("style", s)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-all",
                draft.style === s
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <FlaskConical className="size-4 text-accent" />
          <div>
            <p className="font-medium">Demo mode</p>
            <p className="text-xs text-muted-foreground">
              Skip Gemini and use the offline knowledge base.
            </p>
          </div>
        </div>
        <Switch checked={demo} onCheckedChange={setDemo} aria-label="Demo mode" />
      </div>

      <Button type="submit" variant="hero" size="xl" className="w-full" disabled={running}>
        {running ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {running ? "Agents are planning…" : "Launch the agents"}
      </Button>
    </form>
  );
}
