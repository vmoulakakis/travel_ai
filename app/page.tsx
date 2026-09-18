import type { Metadata } from "next";
import { V50TravelIntelligenceHome } from "@/components/v50-travel-intelligence-home";

export const dynamic="force-dynamic";
export const metadata:Metadata={
  title:{absolute:"TravelAI | Η απόδραση που ταιριάζει σε αυτό που πραγματικά θέλεις"},
  description:"Μίλα φυσικά με έναν AI travel agent που καταλαβαίνει το brief σου, συγκρίνει πραγματικές διαμονές, σε ρωτά μόνο ό,τι χρειάζεται και σου δείχνει τις καλύτερες λύσεις πάνω στον χάρτη.",
  alternates:{canonical:"/",languages:{"el-GR":"/","en-GB":"/en"}},
  openGraph:{
    title:"TravelAI | Agentic Escape Intelligence",
    description:"Από το feeling στην πραγματική ταξιδιωτική λύση — με AI agent, live stays και interactive map.",
    type:"website"
  }
};

export default function HomePage(){
 return <V50TravelIntelligenceHome/>;
}
