export const FALLBACK_SITE_URL = "https://travel-ai-navy-eight.vercel.app";

export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_SITE_URL;
  return raw.replace(/\/$/, "");
}

export const SITE_NAME = "Ελληνικός AI Travel Guru";
export const SITE_TAGLINE = "Το ταξίδι που ταιριάζει σε εσένα";
