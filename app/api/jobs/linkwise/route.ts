import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ingestUrl = process.env.SUPABASE_INGEST_URL;
  const ingestSecret = process.env.SUPABASE_INGEST_SECRET;
  if (!ingestUrl || !ingestSecret) {
    return NextResponse.json(
      { error: "Supabase ingestion is not configured" },
      { status: 503 }
    );
  }

  try {
    const response = await fetch(ingestUrl, {
      method: "POST",
      headers: {
        "x-ingest-secret": ingestSecret,
        "content-type": "application/json"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(55000)
    });

    const body = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { error: "Supabase ingestion failed", detail: body },
        { status: 502 }
      );
    }

    let result: unknown = body;
    try {
      result = JSON.parse(body);
    } catch {
      // Preserve plain-text responses for diagnostics.
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Supabase ingestion request failed",
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 502 }
    );
  }
}
