const PRODUCTION_SITE_URL = "https://travel-ai-lovat-psi.vercel.app";

function normalizeSiteUrl(value: string) {
  const trimmed = value.trim().replace(/\/$/, "");
  if (!trimmed) return PRODUCTION_SITE_URL;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    PRODUCTION_SITE_URL;
  return normalizeSiteUrl(raw);
}

export const SITE_NAME = "Ελληνικός AI Travel Guru";
export const SITE_TAGLINE = "Το ταξίδι που ταιριάζει σε εσένα";
