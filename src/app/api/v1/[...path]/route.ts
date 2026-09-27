const allowedPaths = new Set(["analyze", "redact", "analyze/audio", "redact/audio", "analyze/document", "redact/document"]);

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const path = (await params).path.join("/");
  if (!allowedPaths.has(path)) {
    return Response.json({ code: "not_found", message: "Route not found." }, { status: 404 });
  }

  const apiBaseUrl = (process.env.HUSHMARK_API_BASE_URL ?? "http://127.0.0.1:8000").replace(
    /\/$/,
    "",
  );

  try {
    const upstream = await fetch(`${apiBaseUrl}/v1/${path}`, {
      method: "POST",
      headers: {
        "content-type": request.headers.get("content-type") ?? "application/octet-stream",
        accept: request.headers.get("accept") ?? "*/*",
      },
      body: await request.arrayBuffer(),
      cache: "no-store",
    });

    const headers = new Headers();
    for (const name of ["content-type", "content-disposition", "cache-control"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set("cache-control", "no-store");

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return Response.json(
      {
        code: "service_unavailable",
        message: "The HushMark API is unavailable. Start it and try again.",
      },
      { status: 503 },
    );
  }
}
