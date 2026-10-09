/** Evidence-conscious, deterministic travel insight copy for initial map preview.
 * These are contextual travel suggestions, NOT scraped guest ratings or weather forecasts.
 */
export type MapTravelInsight={bestSeason:string;experience:string;fit:string;basis:string};
export function mapTravelInsight(p:{name:string;location:string;category?:string|null;destinationSlug?:string|null},month:number):MapTravelInsight{
 const text=[p.name,p.location,p.category??"",p.destinationSlug??""].join(" ").toLocaleLowerCase("el-GR");
 const lake=/πλαστηρ|plastira|νεοχωρ|neochor|nevros|καρδιτσ|karditsa/.test(text);
 const mountain=/ορειν|mountain|chalet|forest|ζαγορ|zagor|μετσοβ|metsov|αραχωβ|arachov|pelion|πηλι|τζακι|fireplace/.test(text);
 const island=/νησ|island|cyclad|κυκλαδ|κρητ|crete|corfu|κερκυρ|naxos|ναξ|santorin|σαντοριν/.test(text);
 const wellness=/spa|wellness|ευεξ|θερμ|ιαματ/.test(text);
 if(lake)return{bestSeason:"Άνοιξη και φθινόπωρο για φύση · χειμώνας για ορεινή χαλάρωση",experience:"Λίμνη Πλαστήρα, θέα, περίπατοι και τοπική γαστρονομία",fit:wellness?"Φύση + ευεξία · ιδανικό για ήρεμη απόδραση":"Ήρεμη διαμονή με επίκεντρο τη φύση",basis:"Περιφερειακή ταξιδιωτική εκτίμηση · όχι πρόγνωση ή guest rating"};
 if(mountain)return{bestSeason:"Φθινόπωρο για τοπίο · χειμώνας για ορεινή ατμόσφαιρα",experience:"Φύση, πεζοπορίες και τοπική γαστρονομία στην ευρύτερη περιοχή",fit:wellness?"Ορεινό τοπίο και ευεξία":"Κατάλληλο για ταξιδιώτες που προτιμούν φύση",basis:"Εκτίμηση από όνομα/τοποθεσία · απαιτείται έλεγχος δραστηριοτήτων"};
 if(island)return{bestSeason:"Άνοιξη και αρχές φθινοπώρου για ήπιες εξορμήσεις · καλοκαίρι για παραλίες",experience:"Τοπικοί οικισμοί, γαστρονομία και παραθαλάσσιες διαδρομές",fit:"Νησιωτική εξερεύνηση",basis:"Γενική εποχική εκτίμηση · υπηρεσίες και μετακινήσεις χρειάζονται έλεγχο"};
 return{bestSeason:month>=4&&month<=10?"Άνοιξη–φθινόπωρο, ανάλογα με τις δραστηριότητες":"Εξαρτάται από καιρό, πρόσβαση και διαθέσιμες εμπειρίες",experience:"Αναζήτησε τοπική γαστρονομία, φύση και πολιτιστικά σημεία της περιοχής",fit:wellness?"Πιθανή επιλογή ευεξίας":"Εξερεύνηση με βάση τις προσωπικές σου προτιμήσεις",basis:"Γενική εκτίμηση · δεν τεκμηριώνει παροχές ή κριτικές καταλύματος"};
}
