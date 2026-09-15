import type { Metadata } from "next";
import { V31PageFrame } from "@/components/v31-site-shell";
import { V33EscapeFunnel } from "@/components/v33-escape-funnel";
import "./v33-escape.css";

export const metadata:Metadata={
 title:"AI Weekend Breaks & Holiday Ideas | Βρες την απόδρασή σου",
 description:"Ξεκίνα από το πότε μπορείς να φύγεις και το πώς θέλεις να νιώσεις. Το AI συγκρίνει εποχή, budget, πρόσβαση και πραγματικές επιλογές πριν κάνει 360° research.",
 alternates:{canonical:"/escape",languages:{"el-GR":"/escape"}}
};

export default function EscapePage(){return <V31PageFrame lang="el"><V33EscapeFunnel/></V31PageFrame>}
