import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadV8StayOffers } from "@/lib/data/destination-v8";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const slugPattern = /^[a-z0-9-]{2,80}$/;

function nextWindow() {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + ((5 - start.getUTCDay() + 7) % 7 || 7));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 4);
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)] as const;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get("slug") ?? "").toLowerCase();
  const name = (url.searchParams.get("name") ?? "Το ταξίδι που σου ταιριάζει").slice(0, 70);
  const [start, end] = nextWindow();
  const offers = slugPattern.test(slug) ? await loadV8StayOffers(slug, start, end, 3).catch(() => []) : [];
  const photo = offers.map(item => item.imageUrl || item.thumbUrl).find((item): item is string => Boolean(item));
  const [regularFont, boldFont] = await Promise.all([
    readFile(path.join(process.cwd(), "public/fonts/DejaVuSans.ttf")),
    readFile(path.join(process.cwd(), "public/fonts/DejaVuSans-Bold.ttf")),
  ]);
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", position: "relative", overflow: "hidden", background: "#061424", color: "white" }}>
    {photo ? <img src={photo} alt="" width="1200" height="630" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ position: "absolute", inset: 0, display: "flex", background: "radial-gradient(circle at 78% 30%, #215a74 0, #0a2035 38%, #061424 75%)" }} />}
    <div style={{ position: "absolute", inset: 0, display: "flex", background: "linear-gradient(90deg, rgba(3,14,26,.97) 0%, rgba(3,14,26,.9) 52%, rgba(3,14,26,.28) 100%)" }} />
    <div style={{ position: "relative", width: "760px", padding: "70px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div style={{ display: "flex", color: "#34d7e8", fontSize: 20, fontWeight: 800, letterSpacing: 4 }}>ΕΛΛΗΝΙΚΟΣ AI TRAVEL GURU</div>
      <div style={{ display: "flex", flexDirection: "column" }}><div style={{ display: "flex", fontSize: name.length > 35 ? 64 : 82, fontWeight: 800, lineHeight: .94, letterSpacing: -3 }}>{name}</div><div style={{ display: "flex", marginTop: 22, fontSize: 25, color: "#d1dce3", lineHeight: 1.35 }}>Όχι άλλη μία λίστα. Μία ταξιδιωτική απόφαση που ξεκινά από εσένα.</div></div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 18, color: "#c9d5dd" }}><span style={{ display: "flex", width: 14, height: 14, borderRadius: 99, background: "#8f6bff" }} /> Αληθινά κριτήρια · ειλικρινείς συμβιβασμοί</div>
    </div>
  </div>, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "DejaVu Sans", data: regularFont, weight: 400 },
      { name: "DejaVu Sans", data: boldFont, weight: 800 },
    ],
    headers: { "cache-control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
