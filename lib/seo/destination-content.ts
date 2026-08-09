import type { V8Destination } from "@/lib/decision/v8-types";

const tagCopy: Record<string, { label: string; promise: string; query: string }> = {
  beach: { label: "θάλασσα", promise: "καθαρές θαλάσσιες εικόνες και ανοιχτό ορίζοντα", query: "παραθαλάσσιες διακοπές" },
  nature: { label: "φύση", promise: "φύση που αλλάζει πραγματικά τον ρυθμό", query: "διακοπές στη φύση" },
  culture: { label: "πολιτισμός", promise: "ιστορία, τοπική ζωή και πολιτισμό", query: "πολιτιστικό ταξίδι" },
  food: { label: "γεύση", promise: "γεύσεις που γίνονται μέρος του ταξιδιού", query: "γαστρονομικό ταξίδι" },
  romantic: { label: "για δύο", promise: "χώρο για σύνδεση χωρίς υπερβολικό πρόγραμμα", query: "ρομαντική απόδραση" },
  family: { label: "οικογένεια", promise: "ρυθμό που μπορεί να λειτουργήσει για όλη την οικογένεια", query: "οικογενειακές διακοπές" },
  nightlife: { label: "βραδινή ζωή", promise: "ενέργεια που συνεχίζεται μετά τη δύση", query: "προορισμός με νυχτερινή ζωή" },
  adventure: { label: "εξερεύνηση", promise: "κίνηση, ανακάλυψη και νέες εμπειρίες", query: "δραστήριες διακοπές" },
  value: { label: "αξία", promise: "περισσότερη εμπειρία χωρίς περιττή υπερβολή", query: "οικονομικές διακοπές" },
  short_break: { label: "σύντομη απόδραση", promise: "αρκετή αλλαγή σκηνικού σε λίγες ημέρες", query: "απόδραση σαββατοκύριακου" },
};

export function destinationSeo(destination: V8Destination) {
  const traits = destination.tags.map(tag => tagCopy[tag]).filter(Boolean);
  const primary = traits[0] ?? { label: "εμπειρία", promise: "χαρακτήρα και αληθινή αλλαγή σκηνικού", query: "διακοπές στην Ελλάδα" };
  const secondary = traits[1] ?? primary;
  const bestMonths = destination.monthFit
    .map((score, index) => ({ score, month: index + 1 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(item => item.month);
  const crowd = destination.crowdLevel >= 4
    ? "Στα δημοφιλή σημεία χρειάζεται σωστή ώρα και πιο επιλεκτικό πρόγραμμα."
    : "Ο ρυθμός μπορεί να μείνει ανθρώπινος, αρκεί να μην γεμίσεις κάθε ώρα του ταξιδιού.";
  const cost = destination.costTier >= 4
    ? "Η διαμονή χρειάζεται έγκαιρο έλεγχο για να προστατευτεί το συνολικό budget."
    : destination.costTier <= 2
      ? "Υπάρχει περιθώριο να κρατήσεις το ταξίδι ισορροπημένο χωρίς να αφαιρέσεις την ουσία."
      : "Το budget εξαρτάται περισσότερο από τις ημερομηνίες και το ύφος διαμονής παρά από τον ίδιο τον τόπο.";
  return {
    title: `${destination.nameEl}: πότε να πας και αν σου ταιριάζει πραγματικά`,
    description: `Ο έξυπνος οδηγός για ${destination.nameEl}: καλύτερη εποχή, ρυθμός, budget, συμβιβασμοί και ποιον ταξιδιώτη εξυπηρετεί.`,
    intro: `${destination.nameEl}: δεν είναι επιλογή για όλους. Γίνεται όμως δυνατή επιλογή όταν αναζητάς ${primary.promise} και ${secondary.promise}.`,
    primaryKeyword: `${destination.nameEl} διακοπές`,
    supportingKeywords: [
      `${destination.nameEl} πότε να πάω`,
      `${destination.nameEl} πόσες μέρες`,
      `${destination.nameEl} ${primary.query}`,
      `${destination.nameEl} για ζευγάρια`,
      `${destination.nameEl} με παιδιά`,
    ],
    labels: traits.slice(0, 5).map(item => item.label),
    bestMonths,
    crowd,
    cost,
    idealNights: `${destination.idealNightsMin}-${destination.idealNightsMax} νύχτες`,
    effort: destination.effortAthens,
  };
}

export const greekKeywordArchitecture = [
  { cluster: "Απόφαση", primary: "πού να πάω διακοπές", intent: "problem-aware", page: "/" },
  { cluster: "Ελλάδα", primary: "προορισμοί στην Ελλάδα", intent: "discovery", page: "/proorismoi" },
  { cluster: "Σύντομο ταξίδι", primary: "αποδράσεις σαββατοκύριακου", intent: "high consideration", page: "/proorismoi" },
  { cluster: "Budget", primary: "οικονομικές διακοπές στην Ελλάδα", intent: "commercial research", page: "/proorismoi" },
  { cluster: "Ψυχολογία", primary: "ποιο ελληνικό νησί μου ταιριάζει", intent: "interactive", page: "/#discovery" },
  { cluster: "Εποχή", primary: "πού να πάω διακοπές τον Σεπτέμβριο", intent: "seasonal", page: "/proorismoi" },
] as const;
