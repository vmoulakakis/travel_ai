import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const slugPattern = /^[a-z0-9-]{2,80}$/;
const safeId = /^[a-zA-Z0-9:_-]{1,160}$/;
const iso = /^\d{4}-\d{2}-\d{2}$/;
const rate = new Map<string, { count: number; until: number }>();

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

function limited(key: string) {
  const now = Date.now();
  const current = rate.get(key);
  if (!current || current.until < now) { rate.set(key, { count: 1, until: now + 10 * 60_000 }); return false; }
  current.count += 1;
  rate.set(key, current);
  return current.count > 3;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const start = typeof body?.start === "string" ? body.start : "";
  const end = typeof body?.end === "string" ? body.end : "";
  const offer = typeof body?.offer === "string" ? body.offer : "";
  const language = body?.language === "en" ? "en" : "el";
  if (!emailPattern.test(email) || email.length > 180 || !slugPattern.test(slug) || !safeId.test(offer) || !iso.test(start) || !iso.test(end) || Date.parse(end) <= Date.parse(start)) return NextResponse.json({ ok: false, delivery: "download" }, { status: 400 });

  const clientKey = `${request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"}:${createHash("sha256").update(email).digest("hex").slice(0, 12)}`;
  if (limited(clientKey)) return NextResponse.json({ ok: false, delivery: "download" }, { status: 429 });

  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.TRAVEL_GUIDE_FROM_EMAIL;
  if (!resendKey || !from) return NextResponse.json({ ok: false, delivery: "download" }, { status: 503 });

  const origin = new URL(request.url).origin;
  const guideUrl = new URL("/api/guide", origin);
  guideUrl.searchParams.set("slug", slug);
  guideUrl.searchParams.set("start", start);
  guideUrl.searchParams.set("end", end);
  guideUrl.searchParams.set("offer", offer);
  const guideResponse = await fetch(guideUrl, { cache: "no-store", signal: AbortSignal.timeout(25_000) }).catch(() => null);
  if (!guideResponse?.ok || !(guideResponse.headers.get("content-type") ?? "").includes("application/pdf")) return NextResponse.json({ ok: false, delivery: "download" }, { status: 502 });
  const attachment = Buffer.from(await guideResponse.arrayBuffer()).toString("base64");
  const safeSlug = escapeHtml(slug);
  const safeDates = `${escapeHtml(start)} – ${escapeHtml(end)}`;
  const subject = language === "el" ? `Το προσωπικό σου travel guide · ${start}` : `Your personal travel guide · ${start}`;
  const html = language === "el"
    ? `<div style="font-family:Arial,sans-serif;background:#061424;padding:32px;color:#f9f5ea"><div style="max-width:620px;margin:auto"><p style="color:#34d7e8;font-size:12px;font-weight:700;letter-spacing:.12em">ΕΛΛΗΝΙΚΟΣ AI TRAVEL GURU</p><h1 style="font-family:Georgia,serif;font-size:38px;line-height:1.05">Το ταξίδι σου είναι έτοιμο να το πάρεις μαζί.</h1><p style="color:#b6c5cf;line-height:1.65">Επισυνάπτεται το προσωπικό travel dossier για ${safeSlug}, ${safeDates}. Περιλαμβάνει τη βάση που επέλεξες, τον ρυθμό του ταξιδιού, τον ειλικρινή έλεγχο και το ακριβές QR για την τελική διαθεσιμότητα.</p><div style="margin-top:28px;padding:18px;border:1px solid #38546b;border-radius:16px;color:#d7e3e9">Δεν σε προσθέσαμε σε newsletter και δεν θα ακολουθήσει άλλο μήνυμα από αυτή την αποστολή.</div></div></div>`
    : `<div style="font-family:Arial,sans-serif;background:#061424;padding:32px;color:#f9f5ea"><div style="max-width:620px;margin:auto"><p style="color:#34d7e8;font-size:12px;font-weight:700;letter-spacing:.12em">GREEK AI TRAVEL GURU</p><h1 style="font-family:Georgia,serif;font-size:38px;line-height:1.05">Your trip is ready to take with you.</h1><p style="color:#b6c5cf;line-height:1.65">Your personal travel dossier for ${safeSlug}, ${safeDates}, is attached. It includes your chosen base, trip rhythm, the honest check and the exact QR for final availability.</p><div style="margin-top:28px;padding:18px;border:1px solid #38546b;border-radius:16px;color:#d7e3e9">You were not added to a newsletter and no other message will follow from this send.</div></div></div>`;
  const idempotencyKey = `guide-${createHash("sha256").update(`${email}|${slug}|${start}|${end}|${offer}`).digest("hex").slice(0, 32)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "content-type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ from, to: [email], subject, html, attachments: [{ filename: `travel-guide-${slug}.pdf`, content: attachment }] }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!response?.ok) return NextResponse.json({ ok: false, delivery: "download" }, { status: 502 });
  return NextResponse.json({ ok: true, delivery: "email" }, { headers: { "cache-control": "no-store" } });
}
