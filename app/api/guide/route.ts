import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { loadV8DestinationCatalog, loadV8StayOffers } from "@/lib/data/destination-v8";
import { loadDestinationEvidence } from "@/lib/data/evidence-v12";
import { researchDestination } from "@/lib/ai/destination-research";
import { destinationSeo } from "@/lib/seo/destination-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const iso = /^\d{4}-\d{2}-\d{2}$/;
const slugPattern = /^[a-z0-9-]{2,80}$/;
const safeId = /^[a-zA-Z0-9:_-]{1,160}$/;
const A4: [number, number] = [595.28, 841.89];
const palette = { night: rgb(0.024, 0.078, 0.141), navy: rgb(0.04, 0.125, 0.208), cyan: rgb(0.204, 0.843, 0.91), violet: rgb(0.56, 0.42, 1), paper: rgb(0.973, 0.957, 0.925), white: rgb(1, 0.992, 0.973), ink: rgb(0.063, 0.125, 0.188), muted: rgb(0.36, 0.43, 0.49) };

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function drawTextBlock(page: PDFPage, text: string, font: PDFFont, size: number, x: number, y: number, width: number, color = palette.ink, lineHeight = size * 1.45) {
  const lines = wrap(text, font, size, width);
  lines.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, size, font, color }));
  return y - lines.length * lineHeight;
}

function drawTitle(page: PDFPage, kicker: string, title: string, font: PDFFont, bold: PDFFont) {
  page.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: palette.paper });
  page.drawRectangle({ x: 0, y: A4[1] - 155, width: A4[0], height: 155, color: palette.night });
  page.drawText(kicker.toUpperCase(), { x: 44, y: 790, size: 8, font: bold, color: palette.cyan });
  const lines = wrap(title, bold, 27, 500).slice(0, 2);
  lines.forEach((line, index) => page.drawText(line, { x: 44, y: 752 - index * 33, size: 27, font: bold, color: palette.white }));
}

function drawBullet(page: PDFPage, text: string, y: number, font: PDFFont, bold: PDFFont, color = palette.ink) {
  page.drawCircle({ x: 53, y: y + 4, size: 4, color: palette.violet });
  const next = drawTextBlock(page, text, font, 11, 68, y, 455, color, 16);
  return next - 8;
}

async function embedPhoto(pdf: PDFDocument, url?: string | null) {
  if (!url) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "";
    return contentType.includes("png") ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  } catch { return null; }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = (url.searchParams.get("slug") ?? "").toLowerCase();
  const start = url.searchParams.get("start") ?? "";
  const end = url.searchParams.get("end") ?? "";
  const offerId = url.searchParams.get("offer") ?? "";
  if (!slugPattern.test(slug) || !iso.test(start) || !iso.test(end) || Date.parse(end) <= Date.parse(start) || !safeId.test(offerId)) return NextResponse.json({ error: "Invalid guide request" }, { status: 400 });

  const [catalog, offers] = await Promise.all([loadV8DestinationCatalog(), loadV8StayOffers(slug, start, end, 25)]).catch(() => [[], []] as const);
  const destination = catalog.find(item => item.slug === slug);
  const offer = offers.find(item => item.sourceProductId === offerId && item.trackingUrl.startsWith("https://go.linkwi.se/") && item.trackingUrl.includes("/CD104/") && (!item.validFrom || Date.parse(item.validFrom) <= Date.parse(`${start}T23:59:59Z`)) && Boolean(item.validTo) && Date.parse(item.validTo as string) >= Date.parse(`${end}T00:00:00Z`));
  if (!destination || !offer) return NextResponse.json({ error: "No fully valid stay found for this guide" }, { status: 404 });

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([
    readFile(path.join(process.cwd(), "public/fonts/DejaVuSans.ttf")),
    readFile(path.join(process.cwd(), "public/fonts/DejaVuSans-Bold.ttf")),
  ]);
  const regular = await pdf.embedFont(regularBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });
  const qrData = await QRCode.toDataURL(offer.trackingUrl, { errorCorrectionLevel: "H", margin: 2, width: 420, color: { dark: "#061424", light: "#FFFDF8" } });
  const qr = await pdf.embedPng(Buffer.from(qrData.split(",")[1], "base64"));
  const [evidence, insights, photo, ...gallery] = await Promise.all([
    loadDestinationEvidence(slug,start,end),
    researchDestination({destination:destination.nameEl,latitude:destination.latitude,longitude:destination.longitude,language:"el",nights:Math.max(1,Math.round((Date.parse(end)-Date.parse(start))/86400000))}),
    embedPhoto(pdf, offer.imageUrl || offer.thumbUrl),
    ...offers.filter(item=>item.sourceProductId!==offer.sourceProductId).slice(0,3).map(item=>embedPhoto(pdf,item.imageUrl||item.thumbUrl)),
  ]);
  const seo = destinationSeo(destination);
  const dateLabel = `${new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "long" }).format(new Date(`${start}T12:00:00Z`))} - ${new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${end}T12:00:00Z`))}`;

  const footer = (page: PDFPage, pageNo: number) => {
    page.drawLine({ start: { x: 42, y: 102 }, end: { x: 553, y: 102 }, thickness: .7, color: rgb(.78, .8, .8) });
    page.drawImage(qr, { x: 43, y: 21, width: 69, height: 69 });
    page.drawText("ΣΚΑΝΑΡΕ ΤΟ ΑΚΡΙΒΕΣ LINK ΤΗΣ ΕΠΙΛΟΓΗΣ", { x: 126, y: 75, size: 7.4, font: bold, color: palette.violet });
    page.drawText("Τελική τιμή, δωμάτιο, όροι και διαθεσιμότητα", { x: 126, y: 60, size: 7, font: regular, color: palette.ink });
    const urlLines = wrap(offer.trackingUrl, regular, 4.6, 375).slice(0, 2);
    urlLines.forEach((line, index) => page.drawText(line, { x: 126, y: 44 - index * 7, size: 4.6, font: regular, color: palette.muted }));
    page.drawText(`${pageNo}/10`, { x: 520, y: 29, size: 7, font: bold, color: palette.muted });
  };

  const cover = pdf.addPage(A4);
  cover.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: palette.night });
  if (photo) { const scaled = photo.scaleToFit(A4[0], 485); cover.drawImage(photo, { x: (A4[0] - scaled.width) / 2, y: 357, width: scaled.width, height: scaled.height }); cover.drawRectangle({ x: 0, y: 357, width: A4[0], height: 485, color: palette.night, opacity: .35 }); }
  cover.drawText("TRAVEL DOSSIER · 10 ΣΕΛΙΔΕΣ · ΜΟΝΟ ΓΙΑ ΑΥΤΗ ΤΗΝ ΕΠΙΛΟΓΗ", { x: 42, y: 792, size: 8, font: bold, color: palette.cyan });
  cover.drawText(destination.nameEl, { x: 42, y: 640, size: Math.min(58, 410 / Math.max(1, destination.nameEl.length) * 1.8), font: bold, color: palette.white });
  cover.drawText(dateLabel, { x: 44, y: 606, size: 13, font: regular, color: palette.white });
  drawTextBlock(cover, seo.intro, regular, 14, 44, 300, 470, palette.white, 21);
  cover.drawRectangle({ x: 42, y: 132, width: 510, height: 92, color: palette.navy, borderColor: palette.cyan, borderWidth: .6 });
  cover.drawText("Η επιλογή διαμονής που περνά τον έλεγχο ημερομηνιών", { x: 58, y: 198, size: 8, font: bold, color: palette.cyan });
  drawTextBlock(cover, offer.propertyName, bold, 16, 58, 173, 365, palette.white, 20);
  footer(cover, 1);

  const fit = pdf.addPage(A4); drawTitle(fit, "01 · Η ΑΠΟΦΑΣΗ", `Γιατί ${destination.nameEl}`, regular, bold);
  let y = 650; y = drawTextBlock(fit, seo.intro, regular, 15, 46, y, 495, palette.ink, 22) - 26;
  y = drawBullet(fit, `Καλύτερη διάρκεια: ${seo.idealNights}.`, y, regular, bold);
  y = drawBullet(fit, `Δυνατά στοιχεία: ${seo.labels.join(", ") || "τοπικός χαρακτήρας και ισορροπημένος ρυθμός"}.`, y, regular, bold);
  y = drawBullet(fit, seo.crowd, y, regular, bold);
  y = drawBullet(fit, seo.cost, y, regular, bold);
  drawTextBlock(fit, "Η σωστή ερώτηση δεν είναι αν ο προορισμός είναι όμορφος. Είναι αν υποστηρίζει το ταξίδι που χρειάζεσαι τώρα.", bold, 17, 46, y - 20, 495, palette.violet, 24);
  const monthIndex=Math.max(0,Math.min(11,Number(start.slice(5,7))-1));
  const metrics:[[string,number],[string,number],[string,number],[string,number]]=[["ΕΠΟΧΗ",destination.monthFit[monthIndex]??60],["ΕΥΚΟΛΙΑ ΔΙΑΔΡΟΜΗΣ",Math.round(destination.routeConfidence*100)],["ΙΣΟΡΡΟΠΙΑ ΚΟΣΜΟΥ",Math.max(15,110-destination.crowdLevel*18)],["ΕΛΕΓΧΟΣ BUDGET",Math.max(20,110-destination.costTier*17)]];
  let metricY=245;for(const[label,value]of metrics){fit.drawText(label,{x:48,y:metricY+12,size:7,font:bold,color:palette.muted});fit.drawRectangle({x:48,y:metricY,width:470,height:7,color:rgb(.84,.84,.84)});fit.drawRectangle({x:48,y:metricY,width:470*Math.max(0,Math.min(100,value))/100,height:7,color:value>=75?palette.cyan:value>=55?palette.violet:rgb(.85,.42,.25)});fit.drawText(`${Math.round(value)}/100`,{x:524,y:metricY-1,size:7,font:bold,color:palette.ink});metricY-=36;}footer(fit, 2);

  const reputation = pdf.addPage(A4); drawTitle(reputation, "02 · Η ΚΟΙΝΩΝΙΚΗ ΑΠΟΔΕΙΞΗ", "Τι γνωρίζουμε πραγματικά", regular, bold);
  y = 650;
  if (evidence.tripadvisor.length) {
    for (const item of evidence.tripadvisor.slice(0,4)) {
      reputation.drawRectangle({ x: 44, y: y - 60, width: 507, height: 91, color: palette.white, borderColor: rgb(.78,.74,.92), borderWidth: .7 });
      reputation.drawText(`TRIPADVISOR · ${(item.sourceMonth??item.observedAt).slice(0,7)}`, { x: 58, y: y + 10, size: 7.5, font: bold, color: palette.violet });
      drawTextBlock(reputation,item.subjectName,bold,15,58,y-11,285,palette.ink,19);
      if(item.rank!=null)reputation.drawText(`#${item.rank}`,{x:390,y:y-15,size:25,font:bold,color:palette.violet});
      if(item.rating!=null)reputation.drawText(`${item.rating}/${item.ratingScale??5}`,{x:442,y:y-15,size:18,font:bold,color:palette.ink});
      drawTextBlock(reputation,item.headline,regular,8.5,58,y-39,450,palette.muted,12);
      y-=108;
    }
  } else {
    reputation.drawRectangle({x:44,y:390,width:507,height:220,color:rgb(.92,.9,1),borderColor:palette.violet,borderWidth:.8});
    drawTextBlock(reputation,"Δεν δημοσιεύουμε παλιό ranking για να δανειστούμε αξιοπιστία.",bold,22,68,560,455,palette.ink,30);
    drawTextBlock(reputation,"Δεν υπάρχει ενεργό, επαληθευμένο Tripadvisor snapshot για αυτή την επιλογή. Η απουσία εμφανίζεται καθαρά αντί να αντικαθίσταται από εικασία ή κατασκευασμένο score.",regular,12,68,470,455,palette.ink,18);
  }
  footer(reputation,3);

  const onDates = pdf.addPage(A4); drawTitle(onDates, "03 · ΣΤΙΣ ΗΜΕΡΟΜΗΝΙΕΣ ΣΟΥ", "Γεγονότα, τόπος και πραγματικές εικόνες", regular, bold);
  y=650;
  if(evidence.events.length){for(const item of evidence.events.slice(0,3)){onDates.drawText(item.startsAt?new Intl.DateTimeFormat("el-GR",{day:"numeric",month:"short"}).format(new Date(item.startsAt)):"EVENT",{x:48,y,size:10,font:bold,color:palette.violet});y=drawTextBlock(onDates,item.subjectName,bold,16,132,y+3,395,palette.ink,21)-4;y=drawTextBlock(onDates,item.summary||item.headline,regular,9.5,132,y,395,palette.muted,14)-24;}}
  else {y=drawTextBlock(onDates,"Δεν βρέθηκε ακόμη εκδήλωση που να περνά ταυτόχρονα τον έλεγχο επίσημης πηγής, τοποθεσίας και ημερομηνίας.",bold,15,48,y,495,palette.ink,22)-28;}
  const galleryImages=gallery.filter((item):item is NonNullable<typeof item>=>Boolean(item));
  if(galleryImages.length){const cellW=galleryImages.length===1?500:galleryImages.length===2?245:160;galleryImages.forEach((img,index)=>{const scaled=img.scaleToFit(cellW,160);const x=47+index*(cellW+10);onDates.drawImage(img,{x,y:170,width:scaled.width,height:scaled.height});});onDates.drawText("ΠΡΑΓΜΑΤΙΚΕΣ ΕΙΚΟΝΕΣ ΑΠΟ ΕΝΕΡΓΕΣ ΕΠΙΛΟΓΕΣ ΔΙΑΜΟΝΗΣ ΤΗΣ ΒΑΣΗΣ",{x:48,y:150,size:7,font:bold,color:palette.violet});}
  footer(onDates,4);

  const rhythm = pdf.addPage(A4); drawTitle(rhythm, "04 · Ο ΡΥΘΜΟΣ", "Τέσσερις ημέρες χωρίς πρόγραμμα-μαραθώνιο", regular, bold);
  const days = [
    ["Ημέρα 1", "Άφιξη, τακτοποίηση και μία πρώτη βόλτα χωρίς λίστα υποχρεώσεων."],
    ["Ημέρα 2", destination.tags.includes("nature") ? "Μία ολοκληρωμένη εμπειρία φύσης και αρκετός χρόνος για επιστροφή χωρίς πίεση." : "Η χαρακτηριστική εμπειρία του τόπου, με χρόνο για στάσεις και τοπική ζωή."],
    ["Ημέρα 3", destination.tags.includes("beach") ? "Θάλασσα στον δικό σου ρυθμό και ένα βράδυ αφιερωμένο στη γεύση." : "Ημέρα επιλογής: πολιτισμός, γεύση ή εξερεύνηση, όχι και τα τρία μαζί."],
    ["Ημέρα 4", "Μία τελευταία εικόνα που άξιζε και αναχώρηση χωρίς αγχωτικό check-list."],
  ];
  y = 650; for (const [label, copy] of days) { rhythm.drawText(label, { x: 48, y, size: 11, font: bold, color: palette.violet }); y = drawTextBlock(rhythm, copy, regular, 12, 145, y, 390, palette.ink, 18) - 24; } footer(rhythm, 5);

  const budget = pdf.addPage(A4); drawTitle(budget, "05 · ΤΟ BUDGET", "Πού αξίζει να δώσεις και πού όχι", regular, bold);
  y = 650; const budgetItems = [
    ["Δώσε στη θέση", "Η σωστή περιοχή μειώνει χαμένο χρόνο, μετακινήσεις και αποφάσεις."],
    ["Πλήρωσε την ηρεμία όταν χρειάζεται", "Ένα ήσυχο δωμάτιο ή ένα καλό πρωινό μπορεί να αξίζει περισσότερο από μία ακόμη παροχή."],
    ["Μην κυνηγάς κάθε αξιοθέατο", "Το γεμάτο πρόγραμμα δημιουργεί έξτρα κόστη χωρίς ανάλογη εμπειρία."],
    ["Κράτησε περιθώριο", "Άφησε 10%-15% του ταξιδιωτικού budget ελεύθερο για αυτό που θα ανακαλύψεις εκεί."],
  ]; for (const [label, copy] of budgetItems) { budget.drawRectangle({ x: 44, y: y - 42, width: 507, height: 72, color: palette.white, borderColor: rgb(.82, .82, .82), borderWidth: .5 }); budget.drawText(label, { x: 59, y: y + 8, size: 11, font: bold, color: palette.violet }); drawTextBlock(budget, copy, regular, 10, 59, y - 12, 470, palette.ink, 14); y -= 91; } footer(budget, 6);

  const experiences = pdf.addPage(A4); drawTitle(experiences, "06 · Ο ΤΟΠΟΣ", "Εμπειρίες που υπηρετούν τον λόγο του ταξιδιού", regular, bold);
  const experienceList = insights.attractions.length?insights.attractions.slice(0,4).map(item=>`${item.name}: ${item.whyItFits||item.summary||"Χαρακτηριστική εμπειρία του τόπου."}`):[
    destination.tags.includes("food") ? "Κλείσε μία γευστική εμπειρία που βασίζεται σε τοπική κουζίνα, όχι στο πιο φωτογραφημένο τραπέζι." : "Διάλεξε ένα γεύμα με τοπικό χαρακτήρα και χρόνο, όχι τρία βιαστικά stops.",
    destination.tags.includes("nature") ? "Προτίμησε μία ολοκληρωμένη διαδρομή στη φύση με ρεαλιστική επιστροφή πριν κουραστείς." : "Άφησε μία διαδρομή εκτός του πιο προβεβλημένου κέντρου.",
    destination.tags.includes("culture") ? "Συνδύασε ένα πολιτιστικό σημείο με τη γειτονιά γύρω του, ώστε να καταλάβεις τον τόπο και όχι μόνο το μνημείο." : "Βρες το σημείο όπου συναντιούνται η καθημερινή ζωή και η ιστορία του τόπου.",
    destination.tags.includes("nightlife") ? "Διάλεξε ένα βράδυ με ενέργεια και κράτησε το επόμενο πρωινό ελαφρύ." : "Κράτησε ένα βράδυ ανοιχτό για αυθόρμητη επιλογή.",
  ]; y = 650; experienceList.forEach((item, index) => { experiences.drawText(`0${index + 1}`, { x: 48, y, size: 27, font: bold, color: palette.cyan }); y = drawTextBlock(experiences, item, regular, 12, 110, y + 4, 425, palette.ink, 18) - 30; }); footer(experiences, 7);

  const risks = pdf.addPage(A4); drawTitle(risks, "07 · Ο ΕΙΛΙΚΡΙΝΗΣ ΕΛΕΓΧΟΣ", "Τι μπορεί να χαλάσει την επιλογή", regular, bold);
  y = 650; y = drawBullet(risks, seo.crowd, y, regular, bold); y = drawBullet(risks, seo.cost, y, regular, bold); y = drawBullet(risks, "Μην θεωρήσεις ότι μία ωραία πρόγνωση είναι εγγύηση. Έλεγξε ξανά τον καιρό κοντά στην αναχώρηση.", y, regular, bold); y = drawBullet(risks, "Η τελική τιμή, ο τύπος δωματίου και οι όροι επιβεβαιώνονται πάντα στην επόμενη σελίδα πριν προχωρήσεις.", y, regular, bold); risks.drawRectangle({ x: 45, y: 250, width: 505, height: 110, color: rgb(.92, .9, 1), borderColor: palette.violet, borderWidth: .7 }); drawTextBlock(risks, "Κανόνας του Guru: αν ένας συμβιβασμός χτυπά κόκκινη γραμμή σου, η επιλογή απορρίπτεται - ακόμη κι αν είναι δημοφιλής.", bold, 15, 65, 325, 460, palette.ink, 22); footer(risks, 8);

  const packing = pdf.addPage(A4); drawTitle(packing, "08 · Η ΠΡΟΕΤΟΙΜΑΣΙΑ", "Η μικρή λίστα που αποτρέπει τα μεγάλα λάθη", regular, bold);
  y = 650; const checklist = ["Ταυτότητα, εισιτήρια και επιβεβαίωση ονόματος κράτησης", "Έλεγχος καιρού 72 και 24 ώρες πριν", "Μία δεύτερη επιλογή δραστηριότητας για αλλαγή καιρού", "Παπούτσι που αντέχει τον πραγματικό ρυθμό του ταξιδιού", "Offline αντίγραφο διεύθυνσης και βασικών στοιχείων διαμονής", "Ελεύθερος χώρος στο πρόγραμμα - τουλάχιστον μισή ημέρα"]; checklist.forEach(item => { packing.drawRectangle({ x: 49, y: y - 2, width: 14, height: 14, color: palette.white, borderColor: palette.violet, borderWidth: 1 }); y = drawTextBlock(packing, item, regular, 11, 78, y + 1, 455, palette.ink, 16) - 20; }); footer(packing, 9);

  const final = pdf.addPage(A4); drawTitle(final, "09 · ΤΟ ΕΠΟΜΕΝΟ ΒΗΜΑ", "Η επιλογή σου, χωρίς κρυφή βιασύνη", regular, bold);
  final.drawText(destination.nameEl, { x: 46, y: 650, size: 36, font: bold, color: palette.violet });
  final.drawText(dateLabel, { x: 47, y: 615, size: 12, font: regular, color: palette.muted });
  final.drawRectangle({ x: 44, y: 390, width: 507, height: 170, color: palette.night });
  final.drawText("Η ΔΙΑΜΟΝΗ ΠΟΥ ΕΠΕΛΕΞΕΣ ΝΑ ΕΛΕΓΞΕΙΣ", { x: 64, y: 525, size: 8, font: bold, color: palette.cyan });
  drawTextBlock(final, offer.propertyName, bold, 21, 64, 490, 455, palette.white, 28);
  drawTextBlock(final, "Το QR στο κάτω μέρος σε οδηγεί στην τελική σελίδα ελέγχου. Διάβασε τιμή, δωμάτιο, ακυρωτικά και παροχές πριν ολοκληρώσεις οποιαδήποτε απόφαση.", regular, 11, 64, 430, 455, palette.white, 17);
  final.drawImage(qr,{x:202,y:170,width:190,height:190});
  final.drawText("ΣΚΑΝΑΡΕ ΤΗ ΣΥΓΚΕΚΡΙΜΕΝΗ ΕΠΙΛΟΓΗ",{x:185,y:145,size:9,font:bold,color:palette.violet});
  drawTextBlock(final, "Αν κάτι δεν συμφωνεί με τις ημερομηνίες ή τις ανάγκες σου, γύρισε πίσω. Μία σωστή ταξιδιωτική απόφαση αντέχει και στον τελευταίο έλεγχο.", bold, 13, 46, 125, 500, palette.ink, 19); footer(final, 10);

  pdf.setTitle(`${destination.nameEl} - Προσωπικός ταξιδιωτικός οδηγός`);
  pdf.setAuthor("Ελληνικός AI Travel Guru");
  pdf.setSubject("Προσωποποιημένος ταξιδιωτικός οδηγός");
  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), { status: 200, headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="travel-guide-${slug}.pdf"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}
