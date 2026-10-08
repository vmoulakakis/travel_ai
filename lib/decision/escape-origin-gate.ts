const placeKey=(v:string)=>v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zα-ω0-9]/gi,"");
export const sameOrigin=(origin:string,destination:string,slug?:string|null)=>{
 const a=placeKey(origin),b=placeKey(destination),s=placeKey(slug??"");
 if(!a)return false;
 const athens=["αθηνα","αθηνας","athina","athens","athina"];
 const thess=["θεσσαλονικη","thessaloniki","salonika"];
 const aliases=[athens,thess];
 const group=aliases.find(xs=>xs.some(x=>a===x||a.startsWith(x)));
 if(group)return group.some(x=>b===x||s===x||b.startsWith(x));
 return a.length>=4&&(b===a||s===a);
};
