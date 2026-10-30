import type { Metadata } from "next";
import { V31PageFrame } from "@/components/v31-site-shell";
import HiddenGreeceExplorer from "./hidden-greece-explorer";

export const metadata:Metadata={
  title:"Hidden Greece | Το έξυπνο atlas της άγνωστης Ελλάδας",
  description:"Βρες εξαιρετικά λιγότερο προβεβλημένα μέρη στην Ελλάδα, αξιολόγησε την εποχή και την πρόσβαση, και σχεδίασε απόδραση 1–7 διανυκτερεύσεων με γεωτοποθετημένες βάσεις διαμονής.",
  alternates:{canonical:"/guides/hidden-greece"},
  openGraph:{
    type:"website",locale:"el_GR",
    title:"Hidden Greece — The Places You Didn't Know You Needed",
    description:"Ανακάλυψε τον κρυφό τόπο που ταιριάζει στη δική σου ανάγκη. Πραγματικές πηγές, πρακτικός χάρτης, τίμιοι περιορισμοί και βάσεις διαμονής.",
  },
  robots:{index:true,follow:true}
};

export default function HiddenGreecePage(){
  return <V31PageFrame lang="el">
    <HiddenGreeceExplorer/>
  </V31PageFrame>;
}
