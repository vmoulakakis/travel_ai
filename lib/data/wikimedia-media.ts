type WikiPage={title?:string;pageid?:number;thumbnail?:{source?:string;width?:number;height?:number};original?:{source?:string;width?:number;height?:number}};
type WikiPayload={query?:{pages?:WikiPage[]}};
export type WikimediaPhoto={url:string;title:string;pageUrl:string;width?:number;height?:number;attribution:string};

function acceptable(url:string){const v=url.toLowerCase();return /^https:\/\//.test(v)&&!/(flag|coat_of_arms|locator|map_|\.svg(?:\?|$)|logo)/.test(v)}
async function fromHost(host:string,destination:string):Promise<WikimediaPhoto|null>{
  try{
    const api=new URL(`https://${host}/w/api.php`);
    api.search=new URLSearchParams({action:"query",generator:"search",gsrsearch:destination,gsrlimit:"3",prop:"pageimages",piprop:"thumbnail|original",pithumbsize:"1600",format:"json",formatversion:"2",origin:"*"}).toString();
    const response=await fetch(api,{next:{revalidate:604800},signal:AbortSignal.timeout(3500)});if(!response.ok)return null;
    const payload=await response.json() as WikiPayload;
    for(const page of payload.query?.pages??[]){const image=page.thumbnail?.source||page.original?.source;if(!image||!acceptable(image))continue;const title=page.title||destination;return{url:image,title,pageUrl:`https://${host}/wiki/${encodeURIComponent(title.replace(/ /g,"_"))}`,width:page.thumbnail?.width||page.original?.width,height:page.thumbnail?.height||page.original?.height,attribution:`${host} / Wikimedia Commons`};}
    return null;
  }catch{return null}
}

export async function findWikimediaDestinationPhoto(destination:string,language:"el"|"en"="el"):Promise<WikimediaPhoto|null>{
  const primary=language==="el"?"el.wikipedia.org":"en.wikipedia.org";
  return await fromHost(primary,destination)??await fromHost("en.wikipedia.org",destination);
}
