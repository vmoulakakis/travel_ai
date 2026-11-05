import {travelerProfileKeyFromRequest} from "@/lib/ai/travel-intelligence-v45";
import {loadFunnelSessionV70,type FunnelSessionV70} from "@/lib/ai/travel-intelligence-v70";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validV70Uuid(value:string){return uuid.test(value)}
export function requestProfileKeyV70(request:Request){return travelerProfileKeyFromRequest(request)}
export function requestOwnsProfileV70(request:Request,profileKey:string|null){if(!profileKey)return false;return requestProfileKeyV70(request)===profileKey}
export async function loadOwnedSessionV70(request:Request,sessionId:string):Promise<FunnelSessionV70|null>{
 if(!validV70Uuid(sessionId))return null;
 const session=await loadFunnelSessionV70(sessionId);
 if(!session)return null;
 const profileKey=requestProfileKeyV70(request);
 if(session.profile_key&&session.profile_key!==profileKey)return null;
 if(!session.profile_key&&session.auth_user_id)return null;
 return session;
}
