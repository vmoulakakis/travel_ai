import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CSV_BYTES = 5 * 1024 * 1024;
const allowedDatasets = new Set(["auto", "product_feed", "destinations", "evidence", "raw"]);

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid multipart form" }, { status: 400 });

  const adminSecret = String(form.get("adminSecret") ?? "");
  const expectedAdmin = process.env.ADMIN_SECRET ?? process.env.CRON_SECRET ?? "";
  if (!expectedAdmin || adminSecret !== expectedAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "CSV file required" }, { status: 400 });
  if (file.size > MAX_CSV_BYTES) return NextResponse.json({ error: "CSV exceeds 5 MB limit" }, { status: 413 });

  const dataset = String(form.get("dataset") ?? "auto").toLowerCase();
  if (!allowedDatasets.has(dataset)) return NextResponse.json({ error: "Unsupported dataset" }, { status: 400 });

  const url = process.env.SUPABASE_CSV_IMPORT_URL ?? "https://bgvgstpoypqbjnemqcqp.supabase.co/functions/v1/import-travel-csv";
  const ingestSecret = process.env.SUPABASE_INGEST_SECRET;
  if (!ingestSecret) return NextResponse.json({ error: "SUPABASE_INGEST_SECRET is not configured" }, { status: 503 });

  const csv = await file.text();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${url}?dataset=${encodeURIComponent(dataset)}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "x-ingest-secret": ingestSecret,
        "x-file-name": file.name,
        "x-dataset": dataset
      },
      body: csv
    });
    const payload = await response.json().catch(() => ({ error: "CSV importer returned invalid JSON" }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "CSV import failed" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
