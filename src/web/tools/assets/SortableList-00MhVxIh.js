import{t as p,r as v,j as r,X as f}from"./index-ToolsAll.js";/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=p("ChevronDown",[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=p("ChevronUp",[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=p("GripVertical",[["circle",{cx:"9",cy:"12",r:"1",key:"1vctgf"}],["circle",{cx:"9",cy:"5",r:"1",key:"hp0tcf"}],["circle",{cx:"9",cy:"19",r:"1",key:"fkjjf6"}],["circle",{cx:"15",cy:"12",r:"1",key:"1tmaij"}],["circle",{cx:"15",cy:"5",r:"1",key:"19l28e"}],["circle",{cx:"15",cy:"19",r:"1",key:"f4zoj3"}]]);function x(a,o,i){const l=[...a],[n]=l.splice(o,1);return l.splice(i,0,n),l}function D({items:a,getKey:o,render:i,onChange:l,onRemove:n,layout:b="list",label:d="item"}){const[c,u]=v.useState(null),[y,s]=v.useState(null);return r.jsx("ol",{className:`sortable sortable-${b}`,children:a.map((j,e)=>r.jsxs("li",{draggable:!0,className:`${c===e?"dragging":""}${y===e&&c!==e?" drop-target":""}`,onDragStart:t=>{u(e),t.dataTransfer.effectAllowed="move",t.dataTransfer.setData("text/plain",String(e))},onDragOver:t=>{t.preventDefault(),s(e)},onDragLeave:()=>s(t=>t===e?null:t),onDrop:t=>{t.preventDefault(),c!==null&&c!==e&&l(x(a,c,e)),u(null),s(null)},onDragEnd:()=>{u(null),s(null)},children:[b==="list"&&r.jsx(m,{size:16,className:"grip","aria-hidden":"true"}),r.jsx("div",{className:"sortable-body",children:i(j,e)}),r.jsxs("div",{className:"sortable-ctl",children:[r.jsx("button",{type:"button",className:"icon-btn","aria-label":`Move ${d} ${e+1} earlier`,disabled:e===0,onClick:()=>l(x(a,e,e-1)),children:r.jsx(h,{size:15})}),r.jsx("button",{type:"button",className:"icon-btn","aria-label":`Move ${d} ${e+1} later`,disabled:e===a.length-1,onClick:()=>l(x(a,e,e+1)),children:r.jsx(g,{size:15})}),n&&r.jsx("button",{type:"button",className:"icon-btn","aria-label":`Remove ${d} ${e+1}`,onClick:()=>n(e),children:r.jsx(f,{size:15})})]})]},o(j)))})}export{D as S};
