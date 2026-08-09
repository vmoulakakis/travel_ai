"use client";

import { useEffect, useRef } from "react";
import type { V8StayOffer } from "@/lib/decision/v8-types";

type Lang = "el" | "en";

export function StayChoiceMap({
  destination,
  latitude,
  longitude,
  offers,
  selectedOfferId,
  onSelect,
  lang,
}: {
  destination: string;
  latitude: number;
  longitude: number;
  offers: V8StayOffer[];
  selectedOfferId: string | null;
  onSelect: (offer: V8StayOffer) => void;
  lang: Lang;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef(new Map<string, import("leaflet").Marker>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const mappedOffers = offers.filter(
    (offer): offer is V8StayOffer & { latitude: number; longitude: number } =>
      Number.isFinite(offer.latitude) && Number.isFinite(offer.longitude),
  );

  useEffect(() => {
    let cancelled = false;
    async function mount() {
      if (!hostRef.current || mapRef.current) return;
      const L = await import("leaflet");
      if (cancelled || !hostRef.current) return;
      const map = L.map(hostRef.current, {
        attributionControl: false,
        scrollWheelZoom: false,
        zoomControl: true,
      }).setView([latitude, longitude], 11);
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        minZoom: 5,
      }).addTo(map);

      const bounds: Array<[number, number]> = [[latitude, longitude]];
      mappedOffers.forEach((offer, index) => {
        const selected = offer.sourceProductId === selectedOfferId;
        const icon = L.divIcon({
          className: "guru-map-icon-shell",
          html: `<span class="guru-map-marker${selected ? " selected" : ""}"><b>${index + 1}</b></span>`,
          iconSize: [42, 48],
          iconAnchor: [21, 43],
          popupAnchor: [0, -42],
        });
        const marker = L.marker([offer.latitude, offer.longitude], { icon, keyboard: true, title: offer.propertyName })
          .addTo(map)
          .bindTooltip(offer.propertyName, { direction: "top", offset: [0, -38] });
        marker.on("click", () => onSelectRef.current(offer));
        markerRef.current.set(offer.sourceProductId, marker);
        bounds.push([offer.latitude, offer.longitude]);
      });
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [54, 54], maxZoom: 13 });
      window.setTimeout(() => map.invalidateSize(), 120);
    }
    void mount();
    return () => {
      cancelled = true;
      markerRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [destination, latitude, longitude, offers]);

  useEffect(() => {
    markerRef.current.forEach((marker, id) => {
      const element = marker.getElement()?.querySelector(".guru-map-marker");
      element?.classList.toggle("selected", id === selectedOfferId);
      if (id === selectedOfferId) marker.openTooltip();
    });
  }, [selectedOfferId]);

  return (
    <section className="stay-map-shell" aria-labelledby="stay-map-title">
      <div className="stay-map-copy">
        <span>02 · {lang === "el" ? "ΔΙΑΛΕΞΕ ΒΑΣΗ" : "CHOOSE A BASE"}</span>
        <h4 id="stay-map-title">{lang === "el" ? `Πού θα μένεις στην ${destination};` : `Where will you stay in ${destination}?`}</h4>
        <p>{lang === "el" ? "Πάτησε έναν αριθμό ή μία κάρτα. Κάθε σημείο προέρχεται από τις πραγματικές συντεταγμένες του καταλύματος." : "Choose a number or a card. Every marker uses the stay's real coordinates."}</p>
      </div>
      <div className="stay-map-frame">
        <div ref={hostRef} className="stay-map" aria-label={lang === "el" ? `Χάρτης καταλυμάτων για ${destination}` : `Stay map for ${destination}`} />
        <small className="map-attribution">© OpenStreetMap contributors · ODbL · openstreetmap.org/copyright</small>
        {mappedOffers.length === 0 && <div className="map-empty">{lang === "el" ? "Δεν υπάρχουν ακόμη ασφαλείς συντεταγμένες για αυτά τα stays." : "Verified coordinates are not available for these stays yet."}</div>}
      </div>
    </section>
  );
}
