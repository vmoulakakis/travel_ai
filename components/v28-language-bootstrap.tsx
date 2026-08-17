"use client";

import { useEffect } from "react";

export function V28LanguageBootstrap({ lang }: { lang: "el" | "en" }) {
  useEffect(() => {
    document.documentElement.lang = lang;
    if (lang !== "en") return;
    const timer = window.setTimeout(() => {
      const buttons = document.querySelectorAll<HTMLButtonElement>(".guru-v9 .guru-language button");
      const english = Array.from(buttons).find(button => button.textContent?.trim() === "EN");
      english?.click();
    }, 40);
    return () => window.clearTimeout(timer);
  }, [lang]);
  return null;
}
