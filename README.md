# Hushmark

## Getting Started

Run the HushMark API at `http://127.0.0.1:8000`, then start the frontend:

```bash
bun dev
```

To use a different API origin, set the server-side environment variable:

```bash
HUSHMARK_API_BASE_URL=https://api.example.com bun dev
```

The browser calls the same-origin `/api/v1/*` proxy, so the API does not need CORS configuration.
