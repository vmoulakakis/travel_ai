export const FALLBACK_SITE_URL = "https://travel-ai-git-main-vassilis-projects-3bf8541b.vercel.app";

export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL
    ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
    ?? FALLBACK_SITE_URL;
  return raw.replace(/\/$/, "");
}

export const SITE_NAME = "Ελληνικός AI Travel Guru";
export const SITE_TAGLINE = "Το ταξίδι που ταιριάζει σε εσένα";
