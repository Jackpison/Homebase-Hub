import{d as l,e as u,h as T,n as I,o as P,r as S}from"./t-chunk-U7JOVF4T.js";import"./t-chunk-F4VHQMHZ.js";var M="tools.markdown.v1",j=`# My Notes

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
`,q=o=>/^(https?:|mailto:)/i.test(o)||/^#[\w-]*$/.test(o)?o:null,B=/(`+)([\s\S]*?[^`])\1(?!`)|!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|<((?:https?:\/\/|mailto:)[^>\s]+)>|\*\*(?=\S)([\s\S]*?\S)\*\*|__(?=\S)([\s\S]*?\S)__|~~(?=\S)([\s\S]*?\S)~~|\*(?=[^\s*])([\s\S]*?[^\s*])\*|(?<![\w])_(?=[^\s_])([\s\S]*?[^\s_])_(?![\w])|\\([\\`*_{}[\]()#+\-.!>~|])|(https?:\/\/[^\s<]*[^\s<.,;:!?)\]'"])|(?: {2,}|\\)\n/g;function C(o,e){let s=q(o);return s?l("a",{href:s,rel:"noopener noreferrer",target:s.startsWith("#")?null:"_blank"},e):l("span",{},e)}function g(o){let e=[],s=new RegExp(B.source,"g"),t=0,n;for(;n=s.exec(o);)n.index>t&&e.push(o.slice(t,n.index)),n[1]?e.push(l("code",{text:n[2].replace(/^ (.*) $/,"$1")})):n[4]!==void 0?e.push(C(n[4],["\u{1F5BC} "+(n[3]||"picture")])):n[6]!==void 0?e.push(C(n[6],g(n[5]))):n[7]?e.push(C(n[7],[n[7].replace(/^mailto:/i,"")])):n[8]!==void 0||n[9]!==void 0?e.push(l("strong",{},g(n[8]??n[9]))):n[10]!==void 0?e.push(l("del",{},g(n[10]))):n[11]!==void 0||n[12]!==void 0?e.push(l("em",{},g(n[11]??n[12]))):n[13]?e.push(n[13]):n[14]?e.push(C(n[14],[n[14]])):e.push(l("br")),t=s.lastIndex;return t<o.length&&e.push(o.slice(t)),e}var v=/^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/,R=/^ {0,3}([-*_])(\s*\1){2,}\s*$/,W=/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/,E=o=>o.trim().replace(/^\||\|$/g,"").split(/(?<!\\)\|/).map(e=>e.trim().replace(/\\\|/g,"|")),$=(o,e)=>/^\s*(#{1,6}\s|```|~~~|>)/.test(o)||R.test(o)||v.test(o)||o.includes("|")&&e!==void 0&&W.test(e)&&e.includes("-");function L(o){let e=o.replace(/\r\n?/g,`
`).replace(/\t/g,"    ").split(`
`),s=[];for(let t=0;t<e.length;){let n=e[t];if(!n.trim()){t++;continue}let a;if(a=/^\s*(```|~~~)\s*([\w+-]*)/.exec(n)){let c=[];for(t++;t<e.length&&!e[t].trim().startsWith(a[1]);)c.push(e[t++]);t++,s.push(l("pre",{},l("code",{class:a[2]?"lang-"+a[2]:null,text:c.join(`
`)})));continue}if(a=/^\s*(#{1,6})\s+(.*?)\s*#*\s*$/.exec(n)){s.push(l("h"+a[1].length,{},g(a[2]))),t++;continue}if(R.test(n)){s.push(l("hr")),t++;continue}if(/^\s*>/.test(n)){let c=[];for(;t<e.length&&e[t].trim()&&/^\s*>/.test(e[t]);)c.push(e[t++].replace(/^\s*> ?/,""));s.push(l("blockquote",{},L(c.join(`
`))));continue}if(n.includes("|")&&t+1<e.length&&W.test(e[t+1])&&e[t+1].includes("-")){let c=E(n),h=E(e[t+1]).map(f=>f.endsWith(":")?f.startsWith(":")?"center":"right":null);t+=2;let m=[];for(;t<e.length&&e[t].includes("|")&&e[t].trim();)m.push(E(e[t++]));s.push(l("table",{},l("thead",{},l("tr",{},c.map((f,d)=>l("th",{style:h[d]?"text-align:"+h[d]:null},g(f))))),l("tbody",{},m.map(f=>l("tr",{},c.map((d,r)=>l("td",{style:h[r]?"text-align:"+h[r]:null},g(f[r]||""))))))));continue}if(a=v.exec(n)){let c=a[1].length,h=/\d/.test(a[2]),m=[];for(;t<e.length;){let d=v.exec(e[t]);if(d&&d[1].length<=c+1){if(/\d/.test(d[2])!==h)break;m.push([d[3]]),t++;continue}if(!e[t].trim()){let r=e[t+1]===void 0?null:v.exec(e[t+1]);if(t+1<e.length&&(r&&(r[1].length>c+1||r[1].length<=c+1&&/\d/.test(r[2])===h)||!r&&/^\s{2,}\S/.test(e[t+1]))){m[m.length-1].push(""),t++;continue}break}if(/^\s/.test(e[t])||!$(e[t],e[t+1])){m[m.length-1].push(e[t].replace(new RegExp("^\\s{0,"+(c+4)+"}"),"")),t++;continue}break}let f=l(h?"ol":"ul",{start:h&&parseInt(a[2],10)!==1?parseInt(a[2],10):null});for(let d of m){let r=d[0],k=null,i=/^\[([ xX])\]\s+(.*)$/.exec(r);i&&(r=i[2],k=l("input",{type:"checkbox",disabled:!0,checked:i[1]!==" ","aria-label":i[1]!==" "?"Done":"Not done"}));let p=d.slice(1),_=p.every(w=>!w.trim()||!$(w.trim(),void 0))&&!p.some(w=>!w.trim()),x=l("li",{class:k?"task":null},k,k?" ":null),y=p.length&&!p.some(w=>!w.trim())&&v.test(p[0]);_?x.append(...g([r,...p].join(`
`))):y?x.append(...g(r),...L(p.join(`
`))):x.append(...L([r,...p].join(`
`))),f.append(x)}s.push(f);continue}let b=[];for(;t<e.length&&e[t].trim()&&!(b.length&&$(e[t],e[t+1]));)b.push(e[t++].replace(/^\s+/,""));s.push(l("p",{},g(b.join(`
`))))}return s}function N(o){let e="";try{e=localStorage.getItem(M)??j}catch{e=j}let s=T({value:e,"aria-label":"Markdown text",placeholder:"Write Markdown here"}),t=l("article",{class:"md","aria-label":"Preview"}),n=0,a=()=>{t.replaceChildren(...L(s.value));try{localStorage.setItem(M,s.value)}catch{}};s.addEventListener("input",()=>{clearTimeout(n),n=setTimeout(a,120)});let b=(i,p=i,_="text")=>()=>{let x=s.selectionStart,y=s.selectionEnd,w=s.value.slice(x,y)||_;s.setRangeText(i+w+p,x,y,"select"),s.setSelectionRange(x+i.length,x+i.length+w.length),s.focus(),a()},c=i=>()=>{let p=s.value.lastIndexOf(`
`,s.selectionStart-1)+1;s.setRangeText(i,p,p,"end"),s.focus(),a()},h=()=>((/^#\s+(.+)$/m.exec(s.value)||[])[1]||"document").trim(),m=i=>h().replace(/[^\w\- ]+/g,"").trim().replace(/\s+/g,"-").toLowerCase().slice(0,60)+"."+i||"document."+i,f=()=>`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>`+h().replace(/[<&>"]/g,i=>({"<":"&lt;","&":"&amp;",">":"&gt;",'"':"&quot;"})[i])+`</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#1a1917}code{font:.9em ui-monospace,monospace;background:#f3f1ec;padding:1px 5px;border-radius:5px}pre{background:#f3f1ec;padding:12px;border-radius:8px;overflow:auto}pre code{padding:0}blockquote{margin:0;padding:2px 14px;border-left:3px solid #ccc;color:#555}table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px}li.task{list-style:none}</style></head><body>
`+t.innerHTML+`
</body></html>
`,d=l("input",{type:"file",accept:".md,.markdown,.txt,text/markdown,text/plain",class:"sr","aria-label":"Open a Markdown file",onChange:async()=>{let i=d.files[0];i&&(s.value=await i.text(),a(),P("Opened "+i.name)),d.value=""}}),r=l("div",{class:"row noprint"},u("Bold",{small:!0,onClick:b("**")}),u("Italic",{small:!0,onClick:b("*")}),u("Heading",{small:!0,onClick:c("## ")}),u("List",{small:!0,onClick:c("- ")}),u("Link",{small:!0,onClick:b("[","](https://)","link text")}),u("Code",{small:!0,onClick:b("`")}),u("Quote",{small:!0,onClick:c("> ")})),k=l("div",{class:"row noprint"},d,u("Open File",{icon:"upload",onClick:()=>d.click()}),u("Save .md",{icon:"download",onClick:()=>I(new Blob([s.value],{type:"text/markdown"}),m("md"))}),u("Save .html",{icon:"download",onClick:()=>I(new Blob([f()],{type:"text/html"}),m("html"))}),u("Print or PDF",{icon:"filepdf",primary:!0,onClick:()=>{document.body.classList.add("md-print");let i=()=>{document.body.classList.remove("md-print"),window.removeEventListener("afterprint",i)};window.addEventListener("afterprint",i),window.print(),setTimeout(i,1e3)}}),u("Clear",{ghost:!0,onClick:()=>{confirm("Clear the text? This cannot be undone.")&&(s.value="",a())}}));return o.append(S(k,l("p",{class:"hint noprint",text:"Your text is kept in this browser until you clear it. Pictures show as links, so nothing is loaded from other websites."})),l("div",{class:"mdgrid"},S(r,s),S(t))),a(),()=>clearTimeout(n)}export{L as blocks,N as default,g as inline};
