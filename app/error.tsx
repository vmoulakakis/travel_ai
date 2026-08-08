"use client";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="v8-site" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section className="v8-planner" style={{ maxWidth: 680, margin: 0 }}>
        <span className="v8-kicker">Travel Guru</span>
        <h1 style={{ font: "500 48px/1 Georgia,serif" }}>Το ταξίδι σου δεν χάθηκε.</h1>
        <p>Δεν μπόρεσα να ολοκληρώσω αυτή τη στιγμή όλες τις λεπτομέρειες. Οι επιλογές σου παραμένουν ασφαλείς και μπορείς να συνεχίσεις ξανά.</p>
        <button type="button" className="v8-run" onClick={reset}><span>Συνέχισε ξανά</span><b>→</b></button>
      </section>
    </main>
  );
}
