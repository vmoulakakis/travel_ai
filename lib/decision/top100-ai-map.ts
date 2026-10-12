import {rankCommercialTop100} from "./commercial-360-ranking";
import type {CommercialStay} from "./commercial-360-ranking";
export type TravelMapCandidate=CommercialStay;
/** Nationwide Top 100: evaluate geographical areas first, then rank stays.
 * Uses source-aware commercial proxies until separately trained neural ranking is validated.
 */
export function selectTop100AiPoints<T extends TravelMapCandidate>(rows:T[],max=100):T[]{
 return rankCommercialTop100(rows,max).points;
}
