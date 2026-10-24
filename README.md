# Hushmark

The Next.js frontend runs on Vercel. The browser sends JSON, file uploads, and
downloads directly to the FastAPI service on the VPS. File bytes do not pass
through Next.js routes or Vercel Functions.

## Getting Started

Run the HushMark API at `http://127.0.0.1:8000`, then start the frontend:

```bash
cp .env.example .env.local
bun dev
```

To use a different API, set the public base URL, including `/v1`, in `.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=https://hush-mark-api.nilanjan.xyz/v1
```

The API's `CORS_ALLOWED_ORIGINS` must include the frontend's origin. Local
development defaults to `http://localhost:3000` and `http://127.0.0.1:3000`.

## Deploy the frontend to Vercel

1. Import this repository into Vercel as a Next.js project. Use `bun install
   --frozen-lockfile` as the install command and `bun run build` as the build command.
2. Set `NEXT_PUBLIC_API_BASE_URL=https://hush-mark-api.nilanjan.xyz/v1` in the
   project's environment variables before building. Next.js embeds this URL in
   the browser bundle at build time; changing it requires a new deployment.
3. Add `hush-mark.nilanjan.xyz` as the Vercel custom domain. In Cloudflare, replace
   that subdomain's current VPS A record with the exact DNS record Vercel requests.
   Keep `hush-mark-api.nilanjan.xyz` pointing to the VPS at `15.235.245.44`.
4. Configure the API with HTTPS and
   `CORS_ALLOWED_ORIGINS=https://hush-mark.nilanjan.xyz`. For a Vercel preview,
   explicitly add that preview's origin to the comma-separated allowlist.

The API URL is public configuration. OpenAI credentials belong only on the API
server. Upload and download requests use the same API schemas and size limits
as local development; no object storage is involved.
