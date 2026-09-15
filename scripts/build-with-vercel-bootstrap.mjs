import { execFileSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";

const nextBin=path.join(process.cwd(),"node_modules","next","dist","bin","next");
execFileSync(process.execPath,[nextBin,"build"],{stdio:"inherit",env:process.env});

const isBootstrapVercel=process.env.VERCEL==="1"&&path.basename(process.cwd())==="srcapp";
if(isBootstrapVercel&&existsSync(".next")){
 const target=path.resolve(process.cwd(),"..",".next");
 rmSync(target,{recursive:true,force:true});
 cpSync(path.resolve(process.cwd(),".next"),target,{recursive:true});
 console.log(`[vercel-bootstrap] copied Next output to ${target}`);
}
