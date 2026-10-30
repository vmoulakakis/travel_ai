import type {HiddenPlaceRow} from "./discovery";
export type ItineraryDay={day:number;heading:string;focus:string;steps:string[];requiresVerification:string[]};
export type HiddenTripPlan={nights:number;days:ItineraryDay[];status:"editorial-skeleton";disclaimer:string};
const vocab:Record<string,string>={
  hiking:"πεζοπορία όπου επιτρέπεται και οι συνθήκες το επιτρέπουν",
  waterfall:"παρατήρηση καταρρακτών από επιτρεπτά προσβάσιμα σημεία",
  waterfalls:"παρατήρηση καταρρακτών από επιτρεπτά προσβάσιμα σημεία",
  forest:"ήπια γνωριμία με δασικό τοπίο",
  birding:"παρατήρηση πουλιών χωρίς ενόχληση της πανίδας",
  photography:"φωτογραφία τοπίου με σεβασμό στον τόπο",
  geology:"παρατήρηση γεωλογικού τοπίου",
  village:"περιήγηση σε προσβάσιμους οικισμούς",
  villages:"περιήγηση σε προσβάσιμους οικισμούς",
  views:"εξερεύνηση επιτρεπτών σημείων θέας",
  cycling:"ποδηλατική εξερεύνηση μόνο σε ασφαλή διαδρομή",
  culture:"γνωριμία με την τοπική πολιτιστική κληρονομιά",
  archaeology:"πολιτιστική επίσκεψη, εφόσον υπάρχει πρόσβαση",
  wetlands:"παρατήρηση υγροτοπικού τοπίου",
  swimming:"κολύμπι μόνο όπου επιτρέπεται ρητά και είναι ασφαλές"
};
function safeActivity(a:string):string|null{
 const cleaned=a.toLowerCase().trim();
 return vocab[cleaned]??null;
}
/**
 * Creates a realistic, distinctly labelled trip STRUCTURE; no invented restaurants,
 * attraction hours, routes, local POIs or guest availability. All visit activities
 * are sourced from this particular place's actual tags.
 */
export function buildHiddenTripPlan(place:Pick<HiddenPlaceRow,"name_el"|"activities"|"access_el">,nights:number):HiddenTripPlan{
 const n=Math.min(7,Math.max(1,Math.floor(Number.isFinite(nights)?nights:2)));
 const activities=[...new Set((place.activities??[]).map(safeActivity).filter((v):v is string=>Boolean(v)))];
 const primary=activities[0]??"γνωριμία με το ιδιαίτερο τοπίο";
 const secondary=activities[1]??"χρόνο για ήσυχη εξερεύνηση στην περιοχή";
 const other=activities.slice(2);
 const days:ItineraryDay[]=[];
 for(let d=1;d<=n+1;d++){
  const first=d===1,last=d===n+1,short=n===1;
  const heading=first?"Άφιξη και πρώτη επαφή":last?"Τελευταία εμπειρία και επιστροφή":`Ημέρα εξερεύνησης ${d-1}`;
  const focus=first?"Χρόνος προσαρμογής":last?"Ευέλικτη αναχώρηση":"Βαθύτερη ανακάλυψη";
  const steps=first?[
    "Αναχώρηση με χρόνο ασφαλείας: επιβεβαίωσε τον δρόμο και τις τοπικές συνθήκες πριν φύγεις.",
    `Γνώρισε το ${place.name_el} στον βαθμό που επιτρέπει η ώρα άφιξης και η πρόσβαση.`,
    `Αν οι συνθήκες το επιτρέπουν: ${short?primary:"ήπια πρώτη περιήγηση"}.`
  ]:last?[
    short?`Οργάνωσε τον κύριο χρόνο εμπειρίας γύρω από: ${primary}.`:`Κράτησε χρόνο για: ${secondary} ή ανάπαυση.`,
    "Επιστροφή χωρίς πίεση χρόνου· η πραγματική διαδρομή δεν έχει ακόμη υπολογιστεί."
  ]:[
    `Πρωινή εμπειρία: ${d===2?primary:other[(d-3)%Math.max(1,other.length)]??secondary}.`,
    "Ελεύθερο μεσημέρι για ξεκούραση, απρόβλεπτες καθυστερήσεις ή αλλαγές καιρού.",
    `Εναλλακτικό ήπιο πρόγραμμα: ${secondary}.`
  ];
  days.push({day:d,heading,focus,steps,
    requiresVerification:["Τοπική πρόσβαση και δυνατότητα δραστηριότητας","Καιρικές και οδικές συνθήκες",...(first?["Άφιξη/διανυκτέρευση στο επιλεγμένο κατάλυμα"]:[])]
  });
 }
 return{nights:n,days,status:"editorial-skeleton",
 disclaimer:"Προτεινόμενη δομή ταξιδιού από καταγεγραμμένες δραστηριότητες, όχι επαληθευμένο πρόγραμμα κρατήσεων. Ελέγξτε διαδρομές, άδειες, ωράρια, καιρό και πραγματική διαθεσιμότητα."};
}
