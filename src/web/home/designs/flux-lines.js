/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */
(()=>{var V=null,_=Symbol("Fragment");function ke(t,i,n){if(i==="ref"){typeof n=="function"?n(t):n&&(n.current=t);return}if(!(i==="children"||n==null||n===!1)){if(i==="className"){t.setAttribute("class",n);return}if(i==="style"){for(let e in n){let c=n[e];c==null||c===!1||(e.startsWith("--")?t.style.setProperty(e,String(c)):t.style[e]=typeof c=="number"&&!/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(e)?c+"px":c)}return}if(/^on[A-Z]/.test(i)&&typeof n=="function"){t.addEventListener(i.slice(2).toLowerCase(),n);return}if(i==="htmlFor"){t.setAttribute("for",n);return}t.setAttribute(i,n===!0?"":String(n))}}function ge(t,i){for(let n of i)n==null||n===!1||n===!0||(Array.isArray(n)?ge(t,n):n instanceof Node?t.appendChild(n):t.appendChild(document.createTextNode(String(n))))}function N(t,i,...n){if(typeof t=="function")return t({...i,children:n});let e=t===_?document.createDocumentFragment():document.createElement(t);if(t!==_)for(let c in i||{})ke(e,c,i[c]);return ge(e,n),e}var Pe=(t,i)=>t&&i&&t.length===i.length&&t.every((n,e)=>Object.is(n,i[e]));function D(t){let i=V,n=i.i++;return i.hooks[n]||(i.hooks[n]={current:t})}function U(t,i){let n=V,e=n.i++;n.effects.push([e,t,i])}function Te(t,i,n){let e={hooks:[],effects:[],i:0,cleanups:[],props:i,dead:!1,queued:!1,tree:null},c=()=>{let s=e.effects;e.effects=[];for(let[p,E,v]of s){let R=e.cleanups[p];if(R&&v&&Pe(R.deps,v))continue;if(R&&R.fn)try{R.fn()}catch{}let L;try{L=E()}catch{L=null}e.cleanups[p]={deps:v,fn:typeof L=="function"?L:null}}},M=s=>{V=e,e.i=0,e.effects=[];let p;try{p=t(e.props)}finally{V=null}s&&(e.tree=p,p instanceof Node&&n.appendChild(p)),c()};e.queue=()=>{e.queued||e.dead||(e.queued=!0,Promise.resolve().then(()=>{e.queued=!1,e.dead||M(!1)}))},M(!0);let x=e.tree instanceof Node?e.tree:n,S=["pointermove","mousemove"],G=["clientX","clientY","screenX","screenY","button","buttons","ctrlKey","shiftKey","altKey","metaKey","pointerId","pointerType","isPrimary","width","height","pressure","movementX","movementY"],W=s=>{if(e.dead||s.__hubFwd||s.target instanceof Element&&s.target.closest("input,textarea,select"))return;let p={bubbles:!1,cancelable:!1};for(let v of G)v in s&&(p[v]=s[v]);let E;try{E=new s.constructor(s.type,p)}catch{return}E.__hubFwd=!0,x.dispatchEvent(E)},q=S.filter(()=>matchMedia("(pointer: fine)").matches);return q.forEach(s=>window.addEventListener(s,W,{passive:!0})),{update(s){e.props={...e.props,...s},M(!1)},destroy(){e.dead=!0,q.forEach(s=>window.removeEventListener(s,W));for(let s of e.cleanups)if(s&&s.fn)try{s.fn()}catch{}e.cleanups=[],e.tree instanceof Node&&e.tree.parentNode&&e.tree.parentNode.removeChild(e.tree)},root:x}}function xe(t,i){(window.HubDesigns=window.HubDesigns||{})[t]={start:(n,e)=>Te(i,e||{},n)}}var Q=8,Oe=1.8,ye={up:[0,1],down:[0,-1],left:[-1,0],right:[1,0]},_e=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Ne=`
float hash(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float smin(float a, float b, float k) {
  float r = exp2(-a / k) + exp2(-b / k);
  return -k * log2(r);
}

float sinlerp(float a, float b, float w) {
  return mix(a, b, (sin(w * 3.14159265 - 3.14159265 / 2.0) + 1.0) / 2.0);
}

float vn(vec2 p, float s, float seed) {
  vec2 cellp = floor(p / s);
  vec2 relp = mod(p, s);
  float g1 = hash(vec3(cellp, seed));
  float g2 = hash(vec3(cellp.x + 1.0, cellp.y, seed));
  float g3 = hash(vec3(cellp.x + 1.0, cellp.y + 1.0, seed));
  float g4 = hash(vec3(cellp.x, cellp.y + 1.0, seed));
  float bx = sinlerp(g1, g2, relp.x / s);
  float tx = sinlerp(g4, g3, relp.x / s);
  return sinlerp(bx, tx, relp.y / s);
}

float dbn(vec2 p, float s, float seed) {
  float o = s / 2.0;
  float n0 = vn(p, s, seed);
  float n1 = vn(p + vec2(o, o), s, seed + 0.1);
  float n2 = vn(p + vec2(-o, o), s, seed + 0.2);
  float n3 = vn(p + vec2(o, -o), s, seed + 0.3);
  float n4 = vn(p + vec2(-o, -o), s, seed + 0.4);
  return (2.0 * n0 + 1.5 * n1 + 1.25 * n2 + 1.125 * n3 + n4) / 7.0;
}
`,De=`#version 300 es
precision highp float;
precision highp int;
uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uFlow;
uniform float uSpeed;
uniform float uScale;
uniform float uTurbulence;
uniform float uFluidity;
uniform float uRimWidth;
uniform float uSharpness;
uniform float uShimmer;
uniform float uGlow;
uniform float uLine;
uniform float uMaxHalf;
uniform vec3 uColors[${Q}];
uniform int uColorCount;
uniform vec4 uMagnet;
uniform vec4 uSwirl;
uniform float uReveal;
uniform float uLight;
uniform float uOpaque;
uniform vec3 uBackground;
uniform float uOpacity;
out vec4 outColor;
${Ne}

vec3 palette(float h) {
  float x = clamp(h, 0.0, 1.0) * float(uColorCount - 1);
  int i = int(floor(x));
  int j = min(i + 1, uColorCount - 1);
  return mix(uColors[i], uColors[j], smoothstep(0.0, 1.0, x - float(i)));
}

void main() {
  float ref = 700.0 / max(uScale, 0.05);
  vec2 frag = gl_FragCoord.xy;
  vec2 toMagnet = (frag - uMagnet.xy) / uResolution.y;
  float pull = uMagnet.z * exp(-dot(toMagnet, toMagnet) / (uMagnet.w * uMagnet.w));
  if (pull > 0.001) {
    float angle = pull * 0.55;
    float c = cos(angle);
    float s = sin(angle);
    frag = uMagnet.xy + mat2(c, s, -s, c) * (frag - uMagnet.xy);
  }
  if (uSwirl.w > 0.0) {
    vec2 d = frag - uSwirl.xy;
    float reach = uSwirl.z;
    float angle = uSwirl.w * exp(-dot(d, d) / (reach * reach));
    float c = cos(angle);
    float s = sin(angle);
    frag = uSwirl.xy + mat2(c, s, -s, c) * d;
  }
  vec2 p = frag / uResolution.y * ref;

  float spd = 200.0 * uSpeed;
  float t = uTime;
  vec2 dir = uFlow;
  vec2 perp = vec2(-dir.y, dir.x);
  float distort1 = vn(p + perp * (t * spd), 60.0, 10.0) * 50.0 * uTurbulence;
  float distort2 = vn(p - perp * (t * spd), 120.0, 15.0) * 100.0 * uTurbulence;
  float peaks = dbn(p + distort1 + dir * (t * spd * 0.5), 40.0, 1.0);
  float peaks2 = dbn(p + distort2 - dir * (t * spd * 0.5), 40.0, 0.0);
  float field = smin(peaks, peaks2, max(uFluidity, 0.001));

  float slope = length(vec2(dFdx(field), dFdy(field)));
  float gap = abs(field - 0.4);
  float pixels = gap / max(slope, 1e-6);
  float halfBand = max(uRimWidth, 0.001) * 0.5;
  float across = max(gap / halfBand, pixels / uMaxHalf);
  float band = 5.0 * uRimWidth * (1.0 - across);
  float reveal = smoothstep(0.2, 0.85, pull);
  float shimmer = vn(p + dir * (t * spd * 0.5), 60.0, 12.0) * uShimmer * (1.0 - reveal * 0.75);
  float lit = clamp(band - shimmer, 0.0, 1.0);
  float glow = pow(lit, uSharpness) * uGlow * (1.0 + reveal * 0.25);
  float core = uLine > 0.0 ? smoothstep(uLine + 0.75, uLine - 0.75, pixels) * max(smoothstep(0.08, 0.6, glow), reveal) : 0.0;
  float shine = clamp(glow, 0.0, 1.0);
  float energy = max(shine * shine, core * 0.85) * uReveal;

  float h = clamp(0.5 + (peaks - peaks2) * 0.8, 0.0, 1.0);
  vec3 tint = palette(h);

  if (uLight > 0.5) {
    float chroma = max(tint.r, max(tint.g, tint.b)) - min(tint.r, min(tint.g, tint.b));
    vec3 ink = mix(vec3(0.07, 0.07, 0.08), tint * 0.55, clamp(chroma * 1.6, 0.0, 1.0));
    float cover = energy * uOpacity;
    outColor = uOpaque > 0.5 ? vec4(mix(uBackground, ink, cover), 1.0) : vec4(ink * cover, cover);
    return;
  }

  vec3 light = tint * energy * uOpacity;
  outColor = uOpaque > 0.5 ? vec4(uBackground + light, 1.0) : vec4(light, max(light.r, max(light.g, light.b)));
}`,we=(t,i,n)=>Math.min(n,Math.max(i,t)),be=(t,i,n)=>{let e=t.createShader(i);return e?(t.shaderSource(e,n),t.compileShader(e),t.getShaderParameter(e,t.COMPILE_STATUS)?e:(t.deleteShader(e),null)):null},Ie=t=>{let i=be(t,t.VERTEX_SHADER,_e),n=be(t,t.FRAGMENT_SHADER,De),e=t.createProgram();if(!i||!n||!e)return null;if(t.attachShader(e,i),t.attachShader(e,n),t.bindAttribLocation(e,0,"aPosition"),t.linkProgram(e),t.deleteShader(i),t.deleteShader(n),!t.getProgramParameter(e,t.LINK_STATUS))return t.deleteProgram(e),null;let c={},M=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let x=0;x<M;x++){let S=t.getActiveUniform(e,x);S&&(c[S.name.replace("[0]","")]=t.getUniformLocation(e,S.name))}return{program:e,uniforms:c}},We=({colors:t=["#ffffff","#ffffff","#ffffff"],speed:i=.5,scale:n=1.6,turbulence:e=1,fluidity:c=.1,rimWidth:M=.2,sharpness:x=2.5,shimmer:S=1.5,glow:G=2,lineWidth:W=1,flowDirection:q="down",opacity:s=1,mouseInteraction:p=!0,mouseStrength:E=1,mouseRadius:v=.35,mouseDampening:R=.15,clickSwirl:L=!0,intro:K=!0,lightMode:Se=!1,transparent:Ee=!0,backgroundColor:Re,paused:Ae=!1,dpr:Le,mixBlendMode:ee,className:te="",style:ne,...Fe})=>{let oe=D(null),re=D(null),X=D(null),ie={colors:Array.isArray(t)&&t.length?t.slice(0,Q):["#ffffff"],speed:i,scale:Math.max(.05,n),turbulence:e,fluidity:Math.max(.001,c),rimWidth:Math.max(.001,M),sharpness:Math.max(.1,x),shimmer:Math.max(0,S),glow:Math.max(0,G),lineWidth:Math.max(0,W),flow:ye[q]??ye.down,opacity:we(s,0,1),mouseInteraction:p,mouseStrength:Math.max(0,E),mouseRadius:Math.max(.01,v),mouseDampening:Math.max(0,R),clickSwirl:L,intro:K,lightMode:Se,transparent:Ee,backgroundColor:Re,paused:Ae,dpr:Le},y=D(ie);return y.current=ie,U(()=>{let A=oe.current,h=re.current,o=h?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!A||!h||!o)return;let B=Ie(o);if(!B)return;let l=B.uniforms,ae=o.createBuffer(),Y=o.createVertexArray();o.bindVertexArray(Y),o.bindBuffer(o.ARRAY_BUFFER,ae),o.bufferData(o.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),o.STATIC_DRAW),o.enableVertexAttribArray(0),o.vertexAttribPointer(0,2,o.FLOAT,!1,0,0);let F=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),$=new Map,se=(r,a)=>{if(!r)return a;let u=String(r);if($.has(u))return $.get(u);let f=a;if(F){F.clearRect(0,0,1,1),F.fillStyle="#000000",F.fillStyle=u,F.fillRect(0,0,1,1);let[g,O,b]=F.getImageData(0,0,1,1).data;f=[g/255,O/255,b/255]}return $.set(u,f),f},le=new Float32Array(Q*3),I=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,d={x:0,y:0,inside:!1},m={x:0,y:0,active:0},w={x:0,y:0,age:10},ue=0,C=y.current.intro&&!I?0:1,k=0,P=0,z=!0,j=()=>{let r=y.current,a=h.width/Math.max(1,A.clientWidth);r.colors.forEach((O,b)=>le.set(se(O,[1,1,1]),b*3));let u=Math.min(1,C);o.viewport(0,0,h.width,h.height),o.useProgram(B.program),o.bindVertexArray(Y),o.uniform2f(l.uResolution,h.width,h.height),o.uniform1f(l.uTime,ue),o.uniform2f(l.uFlow,r.flow[0],r.flow[1]),o.uniform1f(l.uSpeed,r.speed),o.uniform1f(l.uScale,r.scale),o.uniform1f(l.uTurbulence,r.turbulence),o.uniform1f(l.uFluidity,r.fluidity),o.uniform1f(l.uRimWidth,r.rimWidth),o.uniform1f(l.uSharpness,r.sharpness),o.uniform1f(l.uShimmer,r.shimmer),o.uniform1f(l.uGlow,r.glow),o.uniform1f(l.uLine,r.lineWidth*a*.5),o.uniform1f(l.uMaxHalf,28*a),o.uniform3fv(l.uColors,le),o.uniform1i(l.uColorCount,r.colors.length),o.uniform4f(l.uMagnet,m.x,m.y,m.active*r.mouseStrength,r.mouseRadius);let f=w.age,g=1.9*Math.min(1,f/.23)*Math.exp(-Math.max(0,f-.23)*1.1);o.uniform4f(l.uSwirl,w.x,w.y,h.height*.22*(1+f*.5),f<6?g:0),o.uniform1f(l.uReveal,u*u*(3-2*u)),o.uniform1f(l.uLight,r.lightMode?1:0),o.uniform1f(l.uOpaque,r.transparent?0:1),o.uniform3fv(l.uBackground,se(r.backgroundColor,r.lightMode?[1,1,1]:[.0706,.0588,.0902])),o.uniform1f(l.uOpacity,r.opacity),o.drawArrays(o.TRIANGLES,0,3)},fe=r=>{if(k=0,!z||document.hidden)return;let a=y.current,u=P?we((r-P)/1e3,5e-4,.05):1/60;P=r;let f=a.paused||I?0:1;ue+=u*f,w.age+=u,a.intro&&!I&&C<1?C=Math.min(1,C+u/Oe):(!a.intro||I)&&(C=1);let g=a.mouseInteraction&&d.inside,O=a.mouseDampening>0?1-Math.exp(-u/a.mouseDampening):1;g&&(m.x+=(d.x-m.x)*O,m.y+=(d.y-m.y)*O);let b=g?1:0;m.active+=(b-m.active)*(1-Math.exp(-u/.3)),Math.abs(b-m.active)<.001&&(m.active=b),j(),f>0||m.active!==b||C<1||w.age<6?k=requestAnimationFrame(fe):P=0},T=()=>{!k&&z&&!document.hidden&&(k=requestAnimationFrame(fe))},Z=()=>{let r=y.current,a=Math.max(1,A.clientWidth),u=Math.max(1,A.clientHeight),f=Math.min(r.dpr||window.devicePixelRatio||1,2);h.width=Math.max(1,Math.round(a*f)),h.height=Math.max(1,Math.round(u*f)),j(),T()},Ce=r=>{let a=A.getBoundingClientRect(),u=r.clientX-a.left,f=r.clientY-a.top,g=h.width/Math.max(1,a.width);d.inside=u>=0&&f>=0&&u<=a.width&&f<=a.height,d.x=u*g,d.y=(a.height-f)*g},J=r=>{let a=d.inside;Ce(r),d.inside&&!a&&m.active<.05&&(m.x=d.x,m.y=d.y),T()},ce=r=>{J(r),!(!d.inside||!y.current.clickSwirl||I)&&(w.x=d.x,w.y=d.y,w.age=0,T())},H=r=>{r.pointerType!=="mouse"&&(d.inside=!1)},de=()=>{d.inside=!1},me=()=>{P=0,T()},pe=new ResizeObserver(Z);pe.observe(A);let he=new IntersectionObserver(r=>{z=r.some(a=>a.isIntersecting),z&&(P=0,T())});he.observe(A),window.addEventListener("pointermove",J,{passive:!0}),window.addEventListener("pointerdown",ce,{passive:!0}),window.addEventListener("pointerup",H,{passive:!0}),window.addEventListener("pointercancel",H,{passive:!0}),document.documentElement.addEventListener("pointerleave",de),document.addEventListener("visibilitychange",me),Z();let ve=y.current.dpr;return X.current=()=>{let r=y.current;if(r.dpr!==ve){ve=r.dpr,Z();return}k||j(),T()},()=>{cancelAnimationFrame(k),X.current=null,pe.disconnect(),he.disconnect(),window.removeEventListener("pointermove",J),window.removeEventListener("pointerdown",ce),window.removeEventListener("pointerup",H),window.removeEventListener("pointercancel",H),document.documentElement.removeEventListener("pointerleave",de),document.removeEventListener("visibilitychange",me),o.deleteProgram(B.program),o.deleteBuffer(ae),o.deleteVertexArray(Y),o.getExtension("WEBGL_lose_context")?.loseContext()}},[]),U(()=>{X.current?.()}),N("div",{ref:oe,className:`flux-lines-container${te?` ${te}`:""}`,style:ee?{...ne,mixBlendMode:ee}:ne,...Fe},N("canvas",{ref:re,className:"flux-lines-canvas","aria-hidden":"true"}))},Me=We;xe("flux-lines",Me);})();
