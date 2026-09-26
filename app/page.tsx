import type { Metadata } from "next";
import { V54FinalHome } from "@/components/v54-final-home";

export const dynamic="force-dynamic";
export const metadata:Metadata={
  title:{absolute:"TravelAI | Η απόδραση που ταιριάζει σε αυτό που πραγματικά θέλεις"},
  description:"Needs-first AI travel planner: ξεκινά από budget, παρέα, ημερομηνίες, mood και πρακτικούς περιορισμούς, συγκρίνει πραγματικές διαμονές και χτίζει την καλύτερη εφαρμόσιμη λύση — γνωστή ή μη.",
  alternates:{canonical:"/",languages:{"el-GR":"/","en-GB":"/en"}},
  openGraph:{
    title:"TravelAI | Agentic Escape Intelligence",
    description:"Από την ανάγκη στην εφαρμόσιμη ταξιδιωτική λύση — με AI agent, live stays, logistics και interactive map.",
    type:"website"
  }
};

export default function HomePage(){
 return <V54FinalHome/>;
}
