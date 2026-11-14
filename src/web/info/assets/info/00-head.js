/*! Homebase Hub - https://github.com/Jackpison/Homebase-Hub
 * Copyright (C) 2026 Jackpison
 * SPDX-License-Identifier: GPL-3.0-only
 * This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, version 3 of the License. It is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License (the LICENSE file) for more details.
 */
// @ts-check
const MAXTAB=20;
let TABS=[],REV=0,PAGE={title:"",icon:""},TIMER={every:7*86400,last:0},active="",locked=false,server=false,
    authed=false,EDIT=false,CLOSED=false,WAIT=false; // WAIT: logged in, waiting for the server to send private content // logged in? editing mode? whole page private and not logged in?
/** @type {(id: string) => any} */   // (any: the page knows which element each id is)
const $=id=>document.getElementById(id);
const esc=HUB.esc;   // the shell's HTML escaper (shell.js, loaded first)
const str=v=>typeof v==="string"?v:"";
const setStatus=t=>$("sync").textContent=t;
const LS="info3",ATAB="info3-tab",ICONK="info3-icon",DRAFT=b=>"info3-draft-"+b.key;
// Unsaved text of private tabs (or of a private page) is kept only for this browser session, never in permanent storage.
const isPrivBox=b=>PAGE.private||!!(TABS.find(t=>t.id===b.tabId)||{}).private;
function dGet(b){try{return sessionStorage.getItem(DRAFT(b))||localStorage.getItem(DRAFT(b))}catch(e){return null}}
function dSet(b,v){
  if(v!=null&&tabOfBox(b).enc)v=null; // never store unencrypted drafts of encrypted tabs
  try{
    if(v==null){sessionStorage.removeItem(DRAFT(b));localStorage.removeItem(DRAFT(b));return}
    if(isPrivBox(b)){sessionStorage.setItem(DRAFT(b),v);localStorage.removeItem(DRAFT(b))}else localStorage.setItem(DRAFT(b),v);
  }catch(e){}
}
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lsSet=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}};
const HF=HUB.fetch;   // the site's fetch: longer timeout and a quiet retry on slow hosts
const api=body=>HF("api.php",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
const when=t=>t?new Date(t*1000).toLocaleString(undefined,{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"";
const savedMsg=()=>"Saved to your server"+(locked&&authed?". You're logged in.":".");
const rid=()=>Array.from(crypto.getRandomValues(new Uint8Array(4)),x=>x.toString(16).padStart(2,"0")).join("");

