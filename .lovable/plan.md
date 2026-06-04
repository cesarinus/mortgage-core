## Plan: `ingest-social-post` edge function (n8n → Lovable proxy)

Create a new public edge function that n8n posts to. The function validates a shared bearer token, sanitizes the payload, and inserts into `social_posts` server-side using the auto-injected `SUPABASE_SERVICE_ROLE_KEY` — so RLS is bypassed safely and the service role key never leaves Lovable.

### New secret
- `N8N_INGEST_SECRET` — shared bearer token between n8n and the edge function. You generate any long random string (e.g. `openssl rand -hex 32`) and I'll add it via the secrets tool, then you paste it into n8n's HTTP Request node as `Authorization: Bearer <value>`.

### New edge function: `supabase/functions/ingest-social-post/index.ts`
- `verify_jwt = false` (registered in `supabase/config.toml`) — n8n won't have a user JWT.
- CORS preflight handler (in case you ever call it from the browser).
- Auth check: `Authorization: Bearer ${N8N_INGEST_SECRET}` — else `401`.
- JSON body validation (manual lightweight checks, matching the existing chat-* function style):
  - `platform` — required, one of `facebook | instagram | linkedin | twitter | tiktok | youtube` (lowercased).
  - `caption` — required string, trimmed, max ~5000 chars.
  - `hashtags` — optional `string[]`, each trimmed, leading `#` stripped, max 30 items.
  - `media_type` — optional, one of `text | image | video | carousel` (default `text`).
  - `status` — optional, one of `draft | approved | queued | scheduled | published` (default `draft`).
  - `scheduled_for` — optional ISO timestamp.
  - Reject unknown fields silently (don't forward arbitrary keys).
- Insert with service role client, return `{ id, status }` on success, `4xx/500` with a clear error otherwise.
- Console-log errors (no payload echo) for debugging via `edge_function_logs`.

### Config
- Add to `supabase/config.toml`:
  ```toml
  [functions.ingest-social-post]
  verify_jwt = false
  ```

### What you do in n8n
Replace the Supabase node with an **HTTP Request** node:
- Method: `POST`
- URL: `https://hyskofjwotohgdtocsie.supabase.co/functions/v1/ingest-social-post`
- Headers:
  - `Authorization: Bearer <N8N_INGEST_SECRET value>`
  - `Content-Type: application/json`
- Body (JSON): `{ "platform": "facebook", "caption": "...", "hashtags": ["swfl","mortgage"], "status": "approved" }`

### Not changing
- `social_posts` table schema and RLS policies stay as-is (authenticated CRUD for the app, service role bypass for the function).
- No frontend changes — the Queue tab already reads `status = 'approved'` rows that this function will create.

### Testing
After deploy, I'll curl the function with a sample payload to confirm a row lands in `social_posts` and the Queue tab picks it up.

Approve to build, and confirm whether you want me to generate the `N8N_INGEST_SECRET` value or if you'll supply one.