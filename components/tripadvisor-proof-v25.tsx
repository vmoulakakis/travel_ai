import type { TripadvisorPlaceV25 } from "@/lib/trip-builder/types-v25";

const TRIPADVISOR_LOGO="https://files.readme.io/9f59534-Vector_1.png";

export function TripadvisorProofV25({item,compact=false}:{item:TripadvisorPlaceV25;compact?:boolean}){
 return <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:compact?7:10,margin:"8px 0 10px"}} aria-label="Tripadvisor rating and ranking">
  <img src={TRIPADVISOR_LOGO} alt="Tripadvisor" style={{height:compact?18:20,width:"auto",objectFit:"contain"}}/>
  {item.ratingImageUrl?<img src={item.ratingImageUrl} alt={item.rating!=null?`${item.rating.toFixed(1)} out of 5 on Tripadvisor`:"Tripadvisor bubble rating"} style={{height:18,width:"auto",objectFit:"contain"}}/>:null}
  {item.reviewCount!=null?<span style={{fontSize:12,fontWeight:700}}>{Math.round(item.reviewCount).toLocaleString()} reviews</span>:null}
  {item.rankingLabel?<span style={{fontSize:12,fontWeight:800}}>{item.rankingLabel}</span>:item.ranking!=null?<span style={{fontSize:12,fontWeight:800}}>#{item.ranking}</span>:null}
  {(item.ranking!=null||item.rankingLabel)?<small style={{fontSize:10,opacity:.72}}>as of {item.sourceMonth}</small>:null}
 </div>
}
