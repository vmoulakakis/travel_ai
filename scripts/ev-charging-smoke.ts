import assert from "node:assert/strict";
import { POST } from "../app/api/ev-charging/route";

async function main(){
 const atProperty=await POST(new Request("http://test/api/ev-charging",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({description:"Hotel parking with electric vehicle charging facilities"})}));
 assert.equal(atProperty.status,200);assert.equal((await atProperty.json() as {status:string}).status,"AT_PROPERTY","Merchant-feed charging claim should be recognized");
 const unknown=await POST(new Request("http://test/api/ev-charging",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({description:"Boutique hotel",latitude:null,longitude:null})}));
 assert.equal((await unknown.json() as {status:string}).status,"UNVERIFIED","Missing coordinates must never invent a nearby charger");
 console.log("EV_CHARGING_EVIDENCE_OK");
}
void main();
