(()=>{
  const root=document.documentElement;
  const runtime=(root.dataset.travelRuntimeOrigin||window.TRAVEL_AI_RUNTIME_ORIGIN||"").replace(/\/$/,"");
  const locale=(document.querySelector("[data-locale]")?.getAttribute("data-locale")||"el").startsWith("en")?"en":"el";
  const api=(path)=>`${runtime}${path}`;
  const qs=(s,scope=document)=>scope.querySelector(s);
  const qsa=(s,scope=document)=>Array.from(scope.querySelectorAll(s));
  const text=(el,value)=>{if(el)el.textContent=value==null||value===""?"—":String(value)};
  const esc=(value)=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

  async function loadLeaflet(){
    if(window.L)return window.L;
    if(!document.querySelector('link[data-travel-leaflet]')){
      const link=document.createElement("link");link.rel="stylesheet";link.href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";link.dataset.travelLeaflet="1";document.head.appendChild(link);
    }
    await new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-travel-leaflet]');
      if(existing){existing.addEventListener("load",resolve,{once:true});existing.addEventListener("error",reject,{once:true});return}
      const script=document.createElement("script");script.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";script.dataset.travelLeaflet="1";script.onload=resolve;script.onerror=reject;document.head.appendChild(script);
    });
    return window.L;
  }

  function ratingLine(signal,kind){
    if(!signal||signal.status!=="live")return locale==="en"?"Live source unavailable":"Δεν υπάρχουν live δεδομένα από την πηγή";
    if(kind==="ta")return signal.rating5!=null?`${signal.rating5.toFixed(1)}/5 · ${Number(signal.reviewCount||0).toLocaleString(locale==="en"?"en-GB":"el-GR")} reviews`:"—";
    return signal.reviewScore10!=null?`${signal.reviewScore10.toFixed(1)}/10 · ${Number(signal.reviewCount||0).toLocaleString(locale==="en"?"en-GB":"el-GR")} reviews`:"—";
  }

  async function loadDetail(slug,summary){
    const panel=qs("[data-evidence-root]");if(!panel)return;
    panel.style.display="block";
    text(qs("[data-evidence-name]",panel),locale==="en"?summary.nameEn:summary.nameEl);
    text(qs("[data-evidence-overall]",panel),summary.aiScore);
    text(qs("[data-evidence-season]",panel),summary.seasonScore);
    text(qs("[data-evidence-access]",panel),summary.routeScore);
    text(qs("[data-evidence-tripadvisor]",panel),ratingLine(summary.tripadvisor,"ta"));
    text(qs("[data-evidence-booking]",panel),ratingLine(summary.booking,"bk"));
    try{
      const response=await fetch(api(`/api/ai-map/${encodeURIComponent(slug)}?lang=${locale}`),{headers:{Accept:"application/json"}});
      if(!response.ok)throw new Error("detail");
      const detail=await response.json();
      text(qs("[data-evidence-policy]",panel),detail.trustPolicy);
      const stays=qs("[data-evidence-stays]",panel),offers=detail.stayWindow?.offers||[];
      if(stays)stays.innerHTML=offers.length?offers.map(o=>`<a href="${esc(o.trackingUrl)}" target="_blank" rel="nofollow sponsored noopener" style="display:block;margin-top:8px">${esc(o.propertyName)}${o.price?` · ${esc(o.price)} ${esc(o.currency||"")}`:""}</a>`).join(""):`<p class="wf-body">${locale==="en"?"No verified stay offers for this evidence window.":"Δεν υπάρχουν verified stay offers για αυτό το evidence window."}</p>`;
    }catch{}
  }

  async function mountMap(){
    const mount=qs("[data-ai-map-root]");if(!mount||!runtime)return;
    try{
      const L=await loadLeaflet(),monthButton=qs("[data-ai-map-months] .wf-chip[data-active='true']"),month=monthButton?.dataset.month||String(new Date().getMonth()+1);
      const response=await fetch(api(`/api/ai-map?lang=${locale}&month=${month}`),{headers:{Accept:"application/json"}});if(!response.ok)throw new Error("map");
      const payload=await response.json(),cities=payload.cities||[];
      qs("[data-ai-map-loading]")?.remove();
      const map=L.map(mount,{zoomControl:true,scrollWheelZoom:true}).setView([38.5,23.2],6);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
      const list=qs("[data-ai-map-ranking-list]");if(list)list.innerHTML="";
      cities.forEach(city=>{
        const marker=L.circleMarker([city.latitude,city.longitude],{radius:13,weight:3,fillOpacity:1}).addTo(map).bindTooltip(`#${city.rank} ${locale==="en"?city.nameEn:city.nameEl} · ${city.aiScore}`);
        marker.on("click",()=>loadDetail(city.slug,city));
        if(list){
          const button=document.createElement("button");button.type="button";button.className="wf-rank";button.innerHTML=`<span class="wf-rank__n">${String(city.rank).padStart(2,"0")}</span><span><strong>${esc(locale==="en"?city.nameEn:city.nameEl)}</strong><br><small>${esc((locale==="en"?city.reasonsEn:city.reasonsEl)?.[0]||city.regionGroup)}</small></span><span class="wf-rank__score">${esc(city.aiScore)}</span>`;
          button.addEventListener("click",()=>{map.setView([city.latitude,city.longitude],8);marker.openTooltip();loadDetail(city.slug,city)});list.appendChild(button);
        }
      });
      qsa("[data-ai-map-months] [data-month]").forEach(button=>button.addEventListener("click",()=>{button.parentElement?.querySelectorAll("[data-month]").forEach(x=>x.removeAttribute("data-active"));button.setAttribute("data-active","true");location.search=`?month=${encodeURIComponent(button.dataset.month||"")}`}));
    }catch(error){
      const loading=qs("[data-ai-map-loading]");if(loading)loading.textContent=locale==="en"?"AI Map is temporarily unavailable.":"Ο AI Χάρτης δεν είναι προσωρινά διαθέσιμος.";
    }
  }

  async function mountPlanner(){
    const form=qs("[data-travel-stream-form]");if(!form||!runtime)return;
    const output=qs("[data-travel-stream-output]");
    form.addEventListener("submit",async event=>{
      event.preventDefault();
      const data=new FormData(form),payload=Object.fromEntries(data.entries());
      payload.language=locale;payload.moods=String(payload.moods||"relax").split(",").filter(Boolean);payload.groupSize=Number(payload.groupSize||2);payload.nights=Number(payload.nights||3);payload.budget=Number(payload.budget||900);
      if(output)output.innerHTML="";
      try{
        const response=await fetch(api("/api/recommend/stream"),{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/x-ndjson"},body:JSON.stringify(payload)});if(!response.ok)throw new Error("planner");
        const reader=response.body?.getReader(),decoder=new TextDecoder();let buffer="";
        if(!reader)return;
        while(true){const{done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split("\n");buffer=lines.pop()||"";for(const line of lines){if(!line.trim())continue;const event=JSON.parse(line);if(output){const row=document.createElement("div");row.className="wf-card";row.style.marginTop="10px";row.innerHTML=`<strong>${esc(event.type)}</strong><p class="wf-body">${esc(event.message||event.payload?.message||`${event.progress??0}%`)}</p>`;output.appendChild(row)}if(event.type==="final")window.dispatchEvent(new CustomEvent("travel:v31-final",{detail:event.result}))}}
      }catch{if(output)output.innerHTML=`<div class="wf-card">${locale==="en"?"The AI planner is temporarily unavailable.":"Ο AI σύμβουλος δεν είναι προσωρινά διαθέσιμος."}</div>`}
    });
  }

  document.addEventListener("DOMContentLoaded",()=>{mountMap();mountPlanner()});
})();
