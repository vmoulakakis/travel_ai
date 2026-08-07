"use client";

import { FormEvent, useState } from "react";

export function AdminCsvImporter(){
  const [status,setStatus]=useState<string>("");
  const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault(); setBusy(true); setStatus("Uploading and validating CSV…");
    try{
      const form=new FormData(event.currentTarget);
      const response=await fetch("/api/admin/import-csv",{method:"POST",body:form});
      const payload=await response.json();
      if(!response.ok) throw new Error(payload?.error||"Import failed");
      setStatus(`Imported ${payload.accepted ?? 0}/${payload.rows ?? 0} rows as ${payload.dataset ?? "data"}. Job ${payload.jobId ?? "created"}.`);
      event.currentTarget.reset();
    }catch(error){setStatus(error instanceof Error?error.message:"Import failed")}finally{setBusy(false)}
  }
  return <form className="admin-import" onSubmit={submit}>
    <div><label>Dataset</label><select name="dataset" defaultValue="auto"><option value="auto">Auto detect</option><option value="product_feed">Product feed</option><option value="destinations">Destinations</option><option value="evidence">Travel evidence</option><option value="raw">Raw staging</option></select></div>
    <div><label>CSV file</label><input name="file" type="file" accept=".csv,text/csv" required/></div>
    <div><label>Admin secret</label><input name="adminSecret" type="password" autoComplete="current-password" required placeholder="ADMIN_SECRET or CRON_SECRET"/></div>
    <button className="primary" disabled={busy}>{busy?"Importing…":"Import into Supabase"}</button>
    {status&&<p className="disclosure">{status}</p>}
  </form>
}
