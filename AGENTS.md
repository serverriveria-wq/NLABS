<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the frontend a static Vite/React SPA; server logic belongs in Supabase Edge Functions so deployment requires no application server.
- Type the client against the preserved application schema during backend migration; generated backend types may describe an empty destination and must remain untouched. The application contract is not evidence that tables or records have been migrated.
- Labs operations require both a server-verified administrator role and a signed, expiring, user-bound gate token; browser storage alone never authorizes privileged actions.
- Signup creates profiles and default membership server-side; privileged roles must never come from signup email or user-editable metadata.
- Phone push dispatch accepts only an existing notification ID and atomically claims its trusted contents through a service-only RPC, preventing arbitrary recipient/content injection and replay without storing caller credentials in SQL.
- Username sign-in is performed server-side and returns a verified Auth session instead of publicly resolving email; password recovery uses the dedicated static SPA recovery route and Supabase email verification flow.
