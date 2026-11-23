<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Trip agents run server-side in `src/lib/trip/agents.server.ts` via the Lovable AI gateway; the client-side orchestrator (`src/lib/trip/orchestrator.ts`) calls one `runAgent` server function per agent so the UI can show live progress.
- Every agent must degrade to `src/lib/trip/fallback.ts` on any AI failure so a plan is always produced.
- Agent outputs are parsed with the zod schemas in `src/lib/trip/types.ts` (lenient `.catch` defaults) — change the schema and prompt shape together.
- Saved trips live in browser localStorage (`src/lib/trip/history.ts`); accounts exist only for the chatbot.
- The Yatri chatbot keeps one conversation per signed-in user in `chat_messages`; `/api/chat` verifies the bearer token, saves both turns, and streams via the AI gateway. UI lives in `src/components/chat/ChatPanel.tsx`, shared by `/chat` and the floating `ChatWidget` mounted in `__root`.
- Auth state comes from the single `AuthProvider` listener in `src/lib/auth.tsx`; protected pages go under `src/routes/_authenticated/`.
- `backend/` is an optional standalone FastAPI mirror of the agents for local Python use; the web app does not depend on it.
- Login-first entry: `/` sends signed-out visitors to `/auth` unless they chose "Continue as guest" this visit (in-memory flag in `src/lib/guest.ts`, so a fresh load shows login again); the planner stays usable without an account.
