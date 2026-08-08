export type ContinuityState = "FULL" | "VERIFIED_PARTIAL" | "RESEARCH_PENDING" | "RESUME_READY";

export interface ContinuityEnvelope {
  state: ContinuityState;
  message: { el: string; en: string };
  canResume: boolean;
}

export const fullContinuity = (): ContinuityEnvelope => ({
  state: "FULL",
  message: { el: "Η πρότασή σου είναι έτοιμη.", en: "Your recommendation is ready." },
  canResume: false,
});

export const partialContinuity = (): ContinuityEnvelope => ({
  state: "VERIFIED_PARTIAL",
  message: {
    el: "Σου κρατάω μόνο όσα μπόρεσα να επιβεβαιώσω με ασφάλεια. Μπορείς να συνεχίσεις κανονικά.",
    en: "I kept only the details I could verify safely. You can continue normally.",
  },
  canResume: true,
});

export const pendingContinuity = (): ContinuityEnvelope => ({
  state: "RESEARCH_PENDING",
  message: {
    el: "Χρειάζομαι λίγο ακόμη για να επιβεβαιώσω τις λεπτομέρειες. Οι επιλογές σου έχουν κρατηθεί.",
    en: "I need a little longer to verify the details. Your choices are saved.",
  },
  canResume: true,
});

const forbidden = /quota|token|rate.?limit|provider|api.?key|openai|deepseek|model|timeout|exception|stack|\b429\b|\b500\b|supabase|vercel/i;

export function safePublicMessage(value: unknown, language: "el" | "en" = "el") {
  if (typeof value === "string" && value.trim() && !forbidden.test(value)) return value.trim().slice(0, 220);
  return language === "en"
    ? "I couldn't safely complete every detail yet. Your choices are saved—please try again in a moment."
    : "Δεν μπόρεσα ακόμη να επιβεβαιώσω με ασφάλεια όλες τις λεπτομέρειες. Οι επιλογές σου έχουν κρατηθεί· δοκίμασε ξανά σε λίγο.";
}

export function containsForbiddenTechnicalText(value: unknown) {
  return forbidden.test(String(value ?? ""));
}
