import type { Metadata } from "next";
export const metadata:Metadata={
 title:"TravelAI Escape Book | Το ταξίδι αρχίζει από το συναίσθημα",
 description:"Το προσωπικό σου ταξίδι στην Ελλάδα: εποχικές προτάσεις, πραγματικά καταλύματα και ένας AI Travel Expert που σε βοηθά να σχεδιάσεις την επόμενη εμπειρία σου.",
 alternates:{canonical:"/escape-book"},
 openGraph:{title:"TravelAI Escape Book",description:"Ανακάλυψε μια εμπειρία στην Ελλάδα που σου ταιριάζει."}
};
export default function Layout({children}:{children:React.ReactNode}){return children}
