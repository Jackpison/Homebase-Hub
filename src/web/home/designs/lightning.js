/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */
(()=>{var Y=null,B=Symbol("Fragment");function Ce(r,n,o){if(n==="ref"){typeof o=="function"?o(r):o&&(o.current=r);return}if(!(n==="children"||o==null||o===!1)){if(n==="className"){r.setAttribute("class",o);return}if(n==="style"){for(let e in o){let p=o[e];p==null||p===!1||(e.startsWith("--")?r.style.setProperty(e,String(p)):r.style[e]=typeof p=="number"&&!/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(e)?p+"px":p)}return}if(/^on[A-Z]/.test(n)&&typeof o=="function"){r.addEventListener(n.slice(2).toLowerCase(),o);return}if(n==="htmlFor"){r.setAttribute("for",o);return}r.setAttribute(n,o===!0?"":String(o))}}function Me(r,n){for(let o of n)o==null||o===!1||o===!0||(Array.isArray(o)?Me(r,o):o instanceof Node?r.appendChild(o):r.appendChild(document.createTextNode(String(o))))}function N(r,n,...o){if(typeof r=="function")return r({...n,children:o});let e=r===B?document.createDocumentFragment():document.createElement(r);if(r!==B)for(let p in n||{})Ce(e,p,n[p]);return Me(e,o),e}var Le=(r,n)=>r&&n&&r.length===n.length&&r.every((o,e)=>Object.is(o,n[e]));function U(r){let n=Y,o=n.i++;return n.hooks[o]||(n.hooks[o]={current:r})}function K(r,n){let o=Y,e=o.i++;o.effects.push([e,r,n])}function Oe(r,n,o){let e={hooks:[],effects:[],i:0,cleanups:[],props:n,dead:!1,queued:!1,tree:null},p=()=>{let c=e.effects;e.effects=[];for(let[d,X,z]of c){let F=e.cleanups[d];if(F&&z&&Le(F.deps,z))continue;if(F&&F.fn)try{F.fn()}catch{}let I;try{I=X()}catch{I=null}e.cleanups[d]={deps:z,fn:typeof I=="function"?I:null}}},S=c=>{Y=e,e.i=0,e.effects=[];let d;try{d=r(e.props)}finally{Y=null}c&&(e.tree=d,d instanceof Node&&o.appendChild(d)),p()};e.queue=()=>{e.queued||e.dead||(e.queued=!0,Promise.resolve().then(()=>{e.queued=!1,e.dead||S(!1)}))},S(!0);let D=e.tree instanceof Node?e.tree:o,G=["pointermove","pointerdown","pointerup","mousemove","mousedown","mouseup"],_=c=>{if(e.dead||c.__hubFwd||c.target instanceof Element&&c.target.closest("input,textarea,select"))return;let d;try{d=new c.constructor(c.type,c)}catch{return}d.__hubFwd=!0,D.dispatchEvent(d)},q=G.filter(()=>matchMedia("(pointer: fine)").matches);return q.forEach(c=>window.addEventListener(c,_,{passive:!0})),{update(c){e.props={...e.props,...c},S(!1)},destroy(){e.dead=!0,q.forEach(c=>window.removeEventListener(c,_));for(let c of e.cleanups)if(c&&c.fn)try{c.fn()}catch{}e.cleanups=[],e.tree instanceof Node&&e.tree.parentNode&&e.tree.parentNode.removeChild(e.tree)},root:D}}function Pe(r,n){(window.HubDesigns=window.HubDesigns||{})[r]={start:(o,e)=>Oe(n,e||{},o)}}var Ee=4,E=4,Re=.11,ie=1.3,Te=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`,Be=`#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uPhase;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uSize;
uniform float uThickness;
uniform float uGlow;
uniform float uFlicker;
uniform float uBranches;
uniform float uXOffset;
uniform float uAngle;
uniform float uSpread;
uniform int uBolts;
uniform vec4 uPointer;
uniform vec4 uStrikes[${E}];
uniform vec4 uStrikeInfo[${E}];
uniform float uFlash;
uniform float uIntro;
uniform float uLight;
uniform float uFade;
uniform float uOpacity;

out vec4 outColor;

const float TAU = 6.28318530718;
const float PERIOD = 8.0;
const float WARP = 2.1;

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float gnoise(vec2 p, float period) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hash22(mod(i, period)), f);
  float b = dot(hash22(mod(i + vec2(1.0, 0.0), period)), f - vec2(1.0, 0.0));
  float c = dot(hash22(mod(i + vec2(0.0, 1.0), period)), f - vec2(0.0, 1.0));
  float d = dot(hash22(mod(i + vec2(1.0, 1.0), period)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float period = PERIOD;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    value += amplitude * gnoise(p, period);
    p = p * 2.0 + vec2(17.0, 31.0);
    period *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

float warpField(vec2 q, float base, float reach, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float period = PERIOD;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    float weight = 1.0;
    if (i >= 3) {
      float estimate = abs(base + value * WARP);
      weight = 1.0 - smoothstep(reach * 0.6, reach, estimate);
      if (weight <= 0.0) break;
      reach *= 0.62;
    }
    value += amplitude * gnoise(q, period) * weight;
    q = q * 2.0 + vec2(17.0, 31.0);
    period *= 2.0;
    amplitude *= 0.5;
  }
  return value * WARP;
}

float flicker(float seed) {
  float steady = 0.82 + 0.18 * sin(TAU * (uPhase * 13.0 + seed)) * sin(TAU * (uPhase * 7.0 + seed * 1.7));
  float burst = 0.0;
  for (int j = 0; j < 3; j++) {
    float at = hash11(seed * 17.0 + float(j) * 5.3);
    float since = fract(uPhase - at) * 10.0;
    burst += exp(-since * 7.0) * (0.75 + 0.45 * sin(since * 70.0));
  }
  return mix(1.0, steady + burst * 0.9, uFlicker);
}

float glow(float d, float width) {
  float reach = d / (width * 3.5);
  return width / (d + width * 0.08) / (1.0 + reach * reach);
}

vec2 gDrift;
float gWidth;
float gCore;
float gPixel;

vec3 bolt(
  vec2 p,
  vec2 offset,
  float seed,
  float pinned,
  float front,
  float strength,
  float branches,
  float blink,
  float branchGain,
  vec2 range,
  float heat,
  int octaves
) {
  vec2 q = p * uSize + gDrift + offset;
  float pin = pinned > 0.5 ? fbm(gDrift + offset, octaves) * WARP : 0.0;
  float warp = warpField(q, p.x - pin, 1.3 * max(1.0, uGlow), octaves) - pin;
  float crackle = heat > 0.001 ? heat * 0.012 * gnoise(q * 9.0 + vec2(41.0, 7.0), PERIOD * 9.0) : 0.0;
  float x = p.x + warp + crackle;
  float d = length(vec2(x, max(front - p.y, 0.0)));
  float energy = glow(d, gWidth * (1.0 + heat * 0.6)) * strength;
  float core = (1.0 - smoothstep(gCore - gPixel, gCore + gPixel, d)) * min(strength, 1.6);
  float line = glow(d, gWidth * 0.55) * strength;

  for (int k = 0; k < 6; k++) {
    float order = float(k) + 0.5;
    if (order > branches + heat * 2.0) break;
    float h = seed * 31.0 + float(k) * 13.7;
    float start = mix(range.x, range.y, hash11(h));
    float span = mix(0.22, 0.7, hash11(h + 3.0));
    if (pinned > 0.5) span = min(span, max(start - 0.04, 0.06));
    float along = (start - p.y) / span;
    if (along <= 0.0 || along >= 1.0) continue;
    float side = hash11(h + 1.0) > 0.5 ? 1.0 : -1.0;
    float slope = mix(0.35, 1.15, hash11(h + 2.0));
    float offset = x - side * slope * (start - p.y);
    if (abs(offset) - 0.12 * along > gWidth * 13.0) continue;
    float gain = branchGain;
    if (blink > 0.5) {
      float window = fract(uPhase * 3.0 + hash11(h + 4.0));
      float shown = smoothstep(0.0, 0.03, window) * (1.0 - smoothstep(0.3, 0.42, window));
      gain *= max(shown, heat * 0.8);
      if (gain <= 0.001) continue;
      gain *= flicker(seed + order);
    }
    if (gain <= 0.001) continue;
    vec2 jq = q * 3.0 + vec2(order * 11.0, order * 5.0);
    float jag = (gnoise(jq, PERIOD * 3.0) * 0.12 + gnoise(jq * 3.0 + vec2(5.0, 9.0), PERIOD * 9.0) * 0.035) * along;
    float bd = abs(offset - jag);
    float taper = pow(1.0 - along, 1.6) * smoothstep(0.0, 0.2, along) * smoothstep(front, front + 0.08, p.y);
    energy += glow(bd, gWidth * 0.4) * taper * gain;
    line += glow(bd, gWidth * 0.2) * taper * gain;
    core += (1.0 - smoothstep(gCore * 0.6 - gPixel, gCore * 0.6 + gPixel, bd)) * taper * min(gain, 1.0) * 0.8;
  }
  return vec3(energy, core, line);
}

void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - uResolution) / uResolution.y;
  gPixel = 2.0 / uResolution.y;
  gDrift = vec2(PERIOD) * uPhase;
  gWidth = 0.07 * uGlow;
  gCore = 0.0032 * uThickness;
  float ca = cos(uAngle);
  float sa = sin(uAngle);
  mat2 turn = mat2(ca, -sa, sa, ca);
  vec2 local = turn * uv;
  vec2 pointer = turn * uPointer.xy;
  vec2 toPointer = uv - uPointer.xy;
  float heat = uPointer.z * exp(-dot(toPointer, toPointer) / 0.09);
  int octaves = uResolution.y > 1400.0 ? 8 : 7;

  float energy = 0.0;
  float core = 0.0;
  float line = 0.0;

  for (int b = 0; b < ${Ee}; b++) {
    if (b >= uBolts) break;
    float seed = float(b) * 7.13 + 0.37;
    float lane = uXOffset + (float(b) - 0.5 * float(uBolts - 1)) * uSpread;
    vec2 p = local - vec2(lane, 0.0);
    float near = exp(-pow(pointer.x - lane, 2.0) / 0.5);
    float lean = uPointer.z * uPointer.w * near * exp(-pow(p.y - pointer.y, 2.0) / 0.14);
    p.x -= lean * clamp(pointer.x - lane, -0.45, 0.45) * 0.55;
    float reveal = uIntro >= 1.0 ? 1.0 : smoothstep(0.0, 0.08, uv.y - (1.1 - 2.4 * uIntro));
    float strength = flicker(seed) * reveal * (1.0 + heat * 1.4) * (1.0 + uFlash);
    vec3 hit = bolt(
      p,
      vec2(float(b) * 3.0, float(b) * 5.0),
      seed,
      0.0,
      -1000.0,
      strength,
      uBranches * 6.0,
      1.0,
      reveal,
      vec2(-0.75, 0.9),
      heat,
      octaves
    );
    energy += hit.x;
    core += hit.y;
    line += hit.z;
  }

  for (int j = 0; j < ${E}; j++) {
    vec4 strike = uStrikes[j];
    if (strike.w <= 0.001) continue;
    vec4 info = uStrikeInfo[j];
    vec2 p = local - turn * strike.xy;
    if (p.y < strike.z - 1.6) continue;
    vec3 hit = bolt(
      p,
      vec2(info.x * 0.731, info.x * 1.377),
      info.x,
      1.0,
      strike.z,
      strike.w,
      uBranches * 6.0,
      0.0,
      strike.w,
      vec2(0.12, info.y),
      heat,
      octaves
    );
    energy += hit.x + info.z * strike.w * glow(length(p), gWidth * 0.5) * 0.12;
    core += hit.y;
    line += hit.z;
  }

  float e = energy * uIntensity * 0.6;
  float hot = clamp(core + smoothstep(6.0, 20.0, e) * 0.55, 0.0, 1.0);
  vec2 edge = min(gl_FragCoord.xy, uResolution - gl_FragCoord.xy) / (uResolution.y * max(uFade, 0.0001) * 0.5);
  float fade = uFade > 0.0 ? smoothstep(0.0, 1.0, edge.x) * smoothstep(0.0, 1.0, edge.y) : 1.0;

  vec3 rgb;
  float alpha;
  if (uLight > 0.5) {
    float stroke = smoothstep(1.0, 3.6, line * uIntensity);
    float halo = 1.0 - exp(-e * 0.35);
    vec3 ink = uColor * 0.82;
    alpha = clamp(stroke + halo * 0.15, 0.0, 1.0);
    rgb = mix(ink, vec3(1.0), hot * 0.85) * alpha;
  } else {
    vec3 lit = 1.0 - exp(-uColor * e * 0.9);
    rgb = mix(lit, vec3(1.0), hot);
    alpha = clamp(max(rgb.r, max(rgb.g, rgb.b)), 0.0, 1.0);
  }
  float keep = fade * uOpacity;
  outColor = vec4(rgb * keep, alpha * keep);
}
`,De=r=>{let n=/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(r).trim());if(!n)return[.5,.6,1];let o=n[1].length===3?n[1].replace(/./g,e=>e+e):n[1];return[0,2,4].map(e=>parseInt(o.slice(e,e+2),16)/255)},_e=r=>{let n=Math.min(1,Math.max(0,r));return n*n*n*(n*(n*6-15)+10)},Ae=(r,n,o)=>{let e=r.createShader(n);return r.shaderSource(e,o),r.compileShader(e),e},qe=["uResolution","uPhase","uColor","uIntensity","uSize","uThickness","uGlow","uFlicker","uBranches","uXOffset","uAngle","uSpread","uBolts","uPointer","uStrikes","uStrikeInfo","uFlash","uIntro","uLight","uFade","uOpacity"],ze=({color:r="#4d6bff",bolts:n=1,spread:o=.6,branches:e=.5,xOffset:p=0,angle:S=0,size:D=1,thickness:G=1,glow:_=1,intensity:q=1,speed:c=1,flicker:d=.6,mouseInteraction:X=!0,mouseStrength:z=1,clickStrike:F=!0,intro:I=!0,fade:$=0,opacity:ae=1,lightMode:se=!1,paused:fe=!1,dpr:ce,className:Se="",style:Ie})=>{let le=U(null),Z=U(null),ue={color:r,bolts:n,spread:o,branches:e,xOffset:p,angle:S,size:D,thickness:G,glow:_,intensity:q,speed:c,flicker:d,mouseInteraction:X,mouseStrength:z,clickStrike:F,intro:I,fade:$,opacity:ae,lightMode:se,paused:fe,dpr:ce},k=U(ue);return k.current=ue,K(()=>{let m=le.current;if(!m)return;let t=m.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1});if(!t)return;let M=t.createProgram();if(t.attachShader(M,Ae(t,t.VERTEX_SHADER,Te)),t.attachShader(M,Ae(t,t.FRAGMENT_SHADER,Be)),t.linkProgram(M),!t.getProgramParameter(M,t.LINK_STATUS))return;let l=Object.fromEntries(qe.map(s=>[s,t.getUniformLocation(M,s)])),J=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,J),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),t.STATIC_DRAW);let he=t.getAttribLocation(M,"aPosition"),C=window.matchMedia("(prefers-reduced-motion: reduce)").matches,g={width:1,height:1,left:0,top:0},a={x:0,y:0,vx:0,vy:0,tx:0,ty:0,presence:0,inside:!1},Q=Array.from({length:E},()=>({x:0,y:0,born:-1,seed:0,reach:2})),L=new Float32Array(E*4),O=new Float32Array(E*4),ee=0,te=.21,P=k.current.intro&&!C?-1:null,H=!0,j=0,oe=0,ne=!1,re=()=>{let s=m.getBoundingClientRect(),i=Math.min(k.current.dpr??window.devicePixelRatio??1,2);g.width=Math.max(1,s.width),g.height=Math.max(1,s.height),g.left=s.left,g.top=s.top;let u=Math.max(1,Math.round(g.width*i)),h=Math.max(1,Math.round(g.height*i));(m.width!==u||m.height!==h)&&(m.width=u,m.height=h)},de=(s,i)=>[(2*s-g.width)/g.height,(g.height-2*i)/g.height],V=s=>{let i=k.current,u=De(i.color),h=0;for(let w=0;w<E;w++){let v=Q[w],b=v.born<0?-1:(s-v.born)/1e3,f=w*4;if(b<0||b>ie){L.fill(0,f,f+4),O.fill(0,f,f+4);continue}let ke=Math.min(1,b/Re),x=b-Re,W=.45+.35*ke;x>=0&&(W=1.8*Math.exp(-x*5.5)*(.85+.2*Math.sin(x*70)),x>.17&&(W+=Math.exp(-(x-.17)*9)),x>.33&&(W+=.7*Math.exp(-(x-.33)*10)),h+=.5*Math.exp(-x*9),x>.17&&(h+=.25*Math.exp(-(x-.17)*12))),W*=1-_e((b-(ie-.4))/.4),L[f]=v.x,L[f+1]=v.y,L[f+2]=v.reach*(1-ke**1.6),L[f+3]=W,O[f]=v.seed,O[f+1]=v.reach,O[f+2]=x>=0?1:0,O[f+3]=0}let y=P===null?1:P<0?0:Math.min(1,(s-P)/420),[A,T]=de(a.x,a.y);t.viewport(0,0,m.width,m.height),t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT),t.useProgram(M),t.bindBuffer(t.ARRAY_BUFFER,J),t.enableVertexAttribArray(he),t.vertexAttribPointer(he,2,t.FLOAT,!1,0,0),t.uniform2f(l.uResolution,m.width,m.height),t.uniform1f(l.uPhase,te),t.uniform3f(l.uColor,u[0],u[1],u[2]),t.uniform1f(l.uIntensity,Math.max(0,i.intensity)),t.uniform1f(l.uSize,Math.max(.05,i.size)),t.uniform1f(l.uThickness,Math.max(0,i.thickness)),t.uniform1f(l.uGlow,Math.max(.01,i.glow)),t.uniform1f(l.uFlicker,C?0:Math.min(1,Math.max(0,i.flicker))),t.uniform1f(l.uBranches,Math.min(1,Math.max(0,i.branches))),t.uniform1f(l.uXOffset,i.xOffset),t.uniform1f(l.uAngle,i.angle*Math.PI/180),t.uniform1f(l.uSpread,i.spread),t.uniform1i(l.uBolts,Math.min(Ee,Math.max(1,Math.round(i.bolts)))),t.uniform4f(l.uPointer,A,T,a.presence,Math.max(0,i.mouseStrength)),t.uniform4fv(l.uStrikes,L),t.uniform4fv(l.uStrikeInfo,O),t.uniform1f(l.uFlash,Math.min(1,h)),t.uniform1f(l.uIntro,y),t.uniform1f(l.uLight,i.lightMode?1:0),t.uniform1f(l.uFade,Math.min(1,Math.max(0,i.fade))),t.uniform1f(l.uOpacity,Math.min(1,Math.max(0,i.opacity))),t.drawArrays(t.TRIANGLE_STRIP,0,4)},pe=s=>{if(j=0,ne||!H||document.hidden)return;let i=k.current,u=Math.min(.05,(s-oe)/1e3||0);oe=s,P!==null&&P<0&&(P=s),!i.paused&&!C&&(te=(te+u*Math.max(0,i.speed)/10)%1);let h=Math.max(1,Math.ceil(u/(1/120))),y=u/h;for(let f=0;f<h;f++)a.vx+=(120*(a.tx-a.x)-19*a.vx)*y,a.vy+=(120*(a.ty-a.y)-19*a.vy)*y,a.x+=a.vx*y,a.y+=a.vy*y;let A=i.mouseInteraction&&a.inside&&!C?1:0;a.presence+=(A-a.presence)*(1-Math.exp(-u/(A>a.presence?.3:.55))),V(s);let T=Q.some(f=>f.born>=0&&s-f.born<ie*1e3+50),w=P!==null&&s-P<450,v=!i.paused&&!C&&i.speed>0,b=Math.abs(A-a.presence)>.002||Math.abs(a.vx)+Math.abs(a.vy)>.5;(v||T||w||b)&&(j=requestAnimationFrame(pe))},R=()=>{j||ne||!H||document.hidden||(oe=performance.now(),j=requestAnimationFrame(pe))},me=s=>{let i=m.getBoundingClientRect(),u=s.clientX-i.left,h=s.clientY-i.top;return[u,h,u>=0&&h>=0&&u<=i.width&&h<=i.height]},ge=s=>{let[i,u,h]=me(s);h&&!a.inside&&a.presence<.02&&(a.x=i,a.y=u,a.vx=a.vy=0),a.tx=i,a.ty=u,a.inside=h,k.current.mouseInteraction&&R()},ve=s=>{s.relatedTarget||(a.inside=!1,R())},xe=s=>{if(!k.current.clickStrike||C)return;let[i,u,h]=me(s);if(!h)return;let[y,A]=de(i,u),T=k.current.angle*Math.PI/180,w=Math.sin(T),v=Math.cos(T),b=g.width/g.height*Math.abs(w)+Math.abs(v),f=Q[ee];ee=(ee+1)%E,f.x=y,f.y=A,f.reach=b-(-w*y+v*A)+.2,f.born=performance.now(),f.seed=Math.random()*100,R()};window.addEventListener("pointermove",ge,{passive:!0}),window.addEventListener("pointerdown",xe,{passive:!0}),window.addEventListener("pointerout",ve);let ye=new ResizeObserver(()=>{re(),V(performance.now()),R()});ye.observe(m);let we=new IntersectionObserver(([s])=>{H=s.isIntersecting,H&&R()});we.observe(m);let be=()=>{document.hidden||R()};return document.addEventListener("visibilitychange",be),re(),V(performance.now()),R(),Z.current={refresh:()=>{re(),V(performance.now()),R()}},()=>{ne=!0,cancelAnimationFrame(j),ye.disconnect(),we.disconnect(),window.removeEventListener("pointermove",ge),window.removeEventListener("pointerdown",xe),window.removeEventListener("pointerout",ve),document.removeEventListener("visibilitychange",be),t.deleteBuffer(J),t.deleteProgram(M),Z.current=null}},[]),K(()=>{Z.current?.refresh()},[r,n,o,e,p,S,D,G,_,q,c,d,$,ae,se,fe,ce]),N("canvas",{ref:le,className:`lightning-container ${Se}`.trim(),style:Ie})},Fe=ze;Pe("lightning",Fe);})();
