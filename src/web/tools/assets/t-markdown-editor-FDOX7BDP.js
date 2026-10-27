import{c as l,d,g as T,m as L,n as P,q as v}from"./t-chunk-SHKPW6GW.js";import"./t-chunk-F4VHQMHZ.js";var M="tools.markdown.v1",R=`# My Notes

Write **bold**, *italic*, ~~struck~~ and \`code\`.

## A List

- Milk
- Bread
  - Brown
- [x] Pay rent
- [ ] Call the bank

1. First
2. Second

> A quote.

| Item | Price |
|---|---:|
| Tea | 40 |
| Cake | 120 |

[A link](https://example.com)

\`\`\`
some code
\`\`\`
`,q=o=>/^(https?:|mailto:)/i.test(o)||/^#[\w-]*$/.test(o)?o:null,B=/(`+)([\s\S]*?[^`])\1(?!`)|!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|<((?:https?:\/\/|mailto:)[^>\s]+)>|\*\*(?=\S)([\s\S]*?\S)\*\*|__(?=\S)([\s\S]*?\S)__|~~(?=\S)([\s\S]*?\S)~~|\*(?=[^\s*])([\s\S]*?[^\s*])\*|(?<![\w])_(?=[^\s_])([\s\S]*?[^\s_])_(?![\w])|\\([\\`*_{}[\]()#+\-.!>~|])|(https?:\/\/[^\s<]*[^\s<.,;:!?)\]'"])|(?: {2,}|\\)\n/g;function y(o,e){let s=q(o);return s?l("a",{href:s,rel:"noopener noreferrer",target:s.startsWith("#")?null:"_blank"},e):l("span",{},e)}function g(o){let e=[],s=new RegExp(B.source,"g"),t=0,n;for(;n=s.exec(o);)n.index>t&&e.push(o.slice(t,n.index)),n[1]?e.push(l("code",{text:n[2].replace(/^ (.*) $/,"$1")})):n[4]!==void 0?e.push(y(n[4],["\u{1F5BC} "+(n[3]||"picture")])):n[6]!==void 0?e.push(y(n[6],g(n[5]))):n[7]?e.push(y(n[7],[n[7].replace(/^mailto:/i,"")])):n[8]!==void 0||n[9]!==void 0?e.push(l("strong",{},g(n[8]??n[9]))):n[10]!==void 0?e.push(l("del",{},g(n[10]))):n[11]!==void 0||n[12]!==void 0?e.push(l("em",{},g(n[11]??n[12]))):n[13]?e.push(n[13]):n[14]?e.push(y(n[14],[n[14]])):e.push(l("br")),t=s.lastIndex;return t<o.length&&e.push(o.slice(t)),e}var S=/^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/,W=/^ {0,3}([-*_])(\s*\1){2,}\s*$/,j=/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/,_=o=>o.trim().replace(/^\||\|$/g,"").split(/(?<!\\)\|/).map(e=>e.trim().replace(/\\\|/g,"|")),I=(o,e)=>/^\s*(#{1,6}\s|```|~~~|>)/.test(o)||W.test(o)||S.test(o)||o.includes("|")&&e!==void 0&&j.test(e)&&e.includes("-");function E(o){let e=o.replace(/\r\n?/g,`
`).replace(/\t/g,"    ").split(`
`),s=[];for(let t=0;t<e.length;){let n=e[t];if(!n.trim()){t++;continue}let a;if(a=/^\s*(```|~~~)\s*([\w+-]*)/.exec(n)){let c=[];for(t++;t<e.length&&!e[t].trim().startsWith(a[1]);)c.push(e[t++]);t++,s.push(l("pre",{},l("code",{class:a[2]?"lang-"+a[2]:null,text:c.join(`
`)})));continue}if(a=/^\s*(#{1,6})\s+(.*?)\s*#*\s*$/.exec(n)){s.push(l("h"+a[1].length,{},g(a[2]))),t++;continue}if(W.test(n)){s.push(l("hr")),t++;continue}if(/^\s*>/.test(n)){let c=[];for(;t<e.length&&e[t].trim()&&/^\s*>/.test(e[t]);)c.push(e[t++].replace(/^\s*> ?/,""));s.push(l("blockquote",{},E(c.join(`
`))));continue}if(n.includes("|")&&t+1<e.length&&j.test(e[t+1])&&e[t+1].includes("-")){let c=_(n),u=_(e[t+1]).map(h=>h.endsWith(":")?h.startsWith(":")?"center":"right":null);t+=2;let p=[];for(;t<e.length&&e[t].includes("|")&&e[t].trim();)p.push(_(e[t++]));s.push(l("table",{},l("thead",{},l("tr",{},c.map((h,r)=>l("th",{style:u[r]?"text-align:"+u[r]:null},g(h))))),l("tbody",{},p.map(h=>l("tr",{},c.map((r,m)=>l("td",{style:u[m]?"text-align:"+u[m]:null},g(h[m]||""))))))));continue}if(a=S.exec(n)){let c=a[1].length,u=/\d/.test(a[2]),p=[];for(;t<e.length;){let r=S.exec(e[t]);if(r&&r[1].length<=c+1){if(/\d/.test(r[2])!==u)break;p.push([r[3]]),t++;continue}if(!e[t].trim()){if(t+1<e.length&&(S.test(e[t+1])||/^\s{2,}\S/.test(e[t+1]))){p[p.length-1].push(""),t++;continue}break}if(/^\s/.test(e[t])||!I(e[t],e[t+1])){p[p.length-1].push(e[t].replace(new RegExp("^\\s{0,"+(c+4)+"}"),"")),t++;continue}break}let h=l(u?"ol":"ul",{start:u&&parseInt(a[2],10)!==1?parseInt(a[2],10):null});for(let r of p){let m=r[0],k=null,i=/^\[([ xX])\]\s+(.*)$/.exec(m);i&&(m=i[2],k=l("input",{type:"checkbox",disabled:!0,checked:i[1]!==" ","aria-label":i[1]!==" "?"Done":"Not done"}));let f=r.slice(1),C=f.every(b=>!b.trim()||!I(b.trim(),void 0))&&!f.some(b=>!b.trim()),w=l("li",{class:k?"task":null},k,k?" ":null);C?w.append(...g([m,...f].join(`
`))):w.append(...E([m,...f].join(`
`))),h.append(w)}s.push(h);continue}let x=[];for(;t<e.length&&e[t].trim()&&!(x.length&&I(e[t],e[t+1]));)x.push(e[t++].replace(/^\s+/,""));s.push(l("p",{},g(x.join(`
`))))}return s}function N(o){let e="";try{e=localStorage.getItem(M)??R}catch{e=R}let s=T({value:e,"aria-label":"Markdown text",placeholder:"Write Markdown here"}),t=l("article",{class:"md","aria-label":"Preview"}),n=0,a=()=>{t.replaceChildren(...E(s.value));try{localStorage.setItem(M,s.value)}catch{}};s.addEventListener("input",()=>{clearTimeout(n),n=setTimeout(a,120)});let x=(i,f=i,C="text")=>()=>{let w=s.selectionStart,b=s.selectionEnd,$=s.value.slice(w,b)||C;s.setRangeText(i+$+f,w,b,"select"),s.setSelectionRange(w+i.length,w+i.length+$.length),s.focus(),a()},c=i=>()=>{let f=s.value.lastIndexOf(`
`,s.selectionStart-1)+1;s.setRangeText(i,f,f,"end"),s.focus(),a()},u=()=>((/^#\s+(.+)$/m.exec(s.value)||[])[1]||"document").trim(),p=i=>u().replace(/[^\w\- ]+/g,"").trim().replace(/\s+/g,"-").toLowerCase().slice(0,60)+"."+i||"document."+i,h=()=>`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>`+u().replace(/[<&>"]/g,i=>({"<":"&lt;","&":"&amp;",">":"&gt;",'"':"&quot;"})[i])+`</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#1a1917}code{font:.9em ui-monospace,monospace;background:#f3f1ec;padding:1px 5px;border-radius:5px}pre{background:#f3f1ec;padding:12px;border-radius:8px;overflow:auto}pre code{padding:0}blockquote{margin:0;padding:2px 14px;border-left:3px solid #ccc;color:#555}table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px}li.task{list-style:none}</style></head><body>
`+t.innerHTML+`
</body></html>
`,r=l("input",{type:"file",accept:".md,.markdown,.txt,text/markdown,text/plain",class:"sr","aria-label":"Open a Markdown file",onChange:async()=>{let i=r.files[0];i&&(s.value=await i.text(),a(),P("Opened "+i.name)),r.value=""}}),m=l("div",{class:"row noprint"},d("Bold",{small:!0,onClick:x("**")}),d("Italic",{small:!0,onClick:x("*")}),d("Heading",{small:!0,onClick:c("## ")}),d("List",{small:!0,onClick:c("- ")}),d("Link",{small:!0,onClick:x("[","](https://)","link text")}),d("Code",{small:!0,onClick:x("`")}),d("Quote",{small:!0,onClick:c("> ")})),k=l("div",{class:"row noprint"},r,d("Open File",{icon:"upload",onClick:()=>r.click()}),d("Save .md",{icon:"download",onClick:()=>L(new Blob([s.value],{type:"text/markdown"}),p("md"))}),d("Save .html",{icon:"download",onClick:()=>L(new Blob([h()],{type:"text/html"}),p("html"))}),d("Print or PDF",{icon:"filepdf",primary:!0,onClick:()=>{document.body.classList.add("md-print");let i=()=>{document.body.classList.remove("md-print"),window.removeEventListener("afterprint",i)};window.addEventListener("afterprint",i),window.print(),setTimeout(i,1e3)}}),d("Clear",{ghost:!0,onClick:()=>{confirm("Clear the text? This cannot be undone.")&&(s.value="",a())}}));return o.append(v(k,l("p",{class:"hint noprint",text:"Your text is kept in this browser until you clear it. Pictures show as links, so nothing is loaded from other websites."})),l("div",{class:"mdgrid"},v(m,s),v(t))),a(),()=>clearTimeout(n)}export{E as blocks,N as default,g as inline};
