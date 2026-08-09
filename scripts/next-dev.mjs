import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here=dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2).flatMap((arg,index,all)=>arg==="--host"?["--hostname",all[index+1]]:index>0&&all[index-1]==="--host"?[]:arg==="--strictPort"?[]:[arg]);
const child=spawn(process.execPath,[resolve(here,"../node_modules/next/dist/bin/next"),"dev",...args],{stdio:"inherit",env:process.env});
child.on("exit",code=>process.exit(code??0));
