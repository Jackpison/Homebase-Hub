/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */
(()=>{var B=null,I=Symbol("Fragment");function Ke(t,a,n){if(a==="ref"){typeof n=="function"?n(t):n&&(n.current=t);return}if(!(a==="children"||n==null||n===!1)){if(a==="className"){t.setAttribute("class",n);return}if(a==="style"){for(let r in n){let m=n[r];m==null||m===!1||(r.startsWith("--")?t.style.setProperty(r,String(m)):t.style[r]=typeof m=="number"&&!/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(r)?m+"px":m)}return}if(/^on[A-Z]/.test(a)&&typeof n=="function"){t.addEventListener(a.slice(2).toLowerCase(),n);return}if(a==="htmlFor"){t.setAttribute("for",n);return}t.setAttribute(a,n===!0?"":String(n))}}function Se(t,a){for(let n of a)n==null||n===!1||n===!0||(Array.isArray(n)?Se(t,n):n instanceof Node?t.appendChild(n):t.appendChild(document.createTextNode(String(n))))}function D(t,a,...n){if(typeof t=="function")return t({...a,children:n});let r=t===I?document.createDocumentFragment():document.createElement(t);if(t!==I)for(let m in a||{})Ke(r,m,a[m]);return Se(r,n),r}var We=(t,a)=>t&&a&&t.length===a.length&&t.every((n,r)=>Object.is(n,a[r]));function N(t){let a=B,n=a.i++;return a.hooks[n]||(a.hooks[n]={current:t})}function V(t,a){let n=B,r=n.i++;n.effects.push([r,t,a])}function Ue(t,a,n){let r={hooks:[],effects:[],i:0,cleanups:[],props:a,dead:!1,queued:!1,tree:null},m=()=>{let c=r.effects;r.effects=[];for(let[h,S,g]of c){let M=r.cleanups[h];if(M&&g&&We(M.deps,g))continue;if(M&&M.fn)try{M.fn()}catch{}let k;try{k=S()}catch{k=null}r.cleanups[h]={deps:g,fn:typeof k=="function"?k:null}}},p=c=>{B=r,r.i=0,r.effects=[];let h;try{h=t(r.props)}finally{B=null}c&&(r.tree=h,h instanceof Node&&n.appendChild(h)),m()};r.queue=()=>{r.queued||r.dead||(r.queued=!0,Promise.resolve().then(()=>{r.queued=!1,r.dead||p(!1)}))},p(!0);let v=r.tree instanceof Node?r.tree:n,y=["pointermove","mousemove"],X=["clientX","clientY","screenX","screenY","button","buttons","ctrlKey","shiftKey","altKey","metaKey","pointerId","pointerType","isPrimary","width","height","pressure","movementX","movementY"],q=c=>{if(r.dead||c.__hubFwd||c.target instanceof Element&&c.target.closest("input,textarea,select"))return;let h={bubbles:!1,cancelable:!1};for(let g of X)g in c&&(h[g]=c[g]);let S;try{S=new c.constructor(c.type,h)}catch{return}S.__hubFwd=!0,v.dispatchEvent(S)},H=y.filter(()=>matchMedia("(pointer: fine)").matches);return H.forEach(c=>window.addEventListener(c,q,{passive:!0})),{update(c){r.props={...r.props,...c},p(!1)},destroy(){r.dead=!0,H.forEach(c=>window.removeEventListener(c,q));for(let c of r.cleanups)if(c&&c.fn)try{c.fn()}catch{}r.cleanups=[],r.tree instanceof Node&&r.tree.parentNode&&r.tree.parentNode.removeChild(r.tree)},root:v}}function Me(t,a){(window.HubDesigns=window.HubDesigns||{})[t]={start:(n,r)=>Ue(a,r||{},n)}}var Ee=8,ae=4,Be=2.2,Ve=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,$e=`#version 300 es
precision highp float;
precision highp int;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uGloss;
uniform float uDepth;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uStarGlow;
uniform float uFlareGain;
uniform float uSquash;
uniform float uSaturation;
uniform float uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationAngle;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion;
uniform int uLayers;
uniform vec3 uColors[${ae}];
uniform int uColorCount;
uniform float uWarp;
uniform float uReveal;
uniform float uMode;
uniform vec3 uBackground;
uniform float uOpacity;
out vec4 outColor;

#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0

float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tri(float x) {
  return abs(fract(x) * 2.0 - 1.0);
}

float tris(float x) {
  float t = fract(x);
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}

float trisn(float x) {
  float t = fract(x);
  return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float Star(vec2 uv, float flare, vec2 radial, float invReach) {
#ifdef WARP
  float along = dot(uv, radial);
  float d = sqrt(max(dot(uv, uv) - uSquash * along * along, 0.0));
#else
  float d = length(uv);
#endif
  float m = uStarGlow / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * flare * uFlareGain;
  uv *= MAT45;
  rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * 0.3 * flare * uFlareGain;
  m *= smoothstep(1.0, 0.2, d * invReach);
#ifdef WARP
  m *= mix(1.0, smoothstep(1.0, 0.55, length(uv) * invReach), min(uWarp * 4.0, 1.0));
#endif
  return m;
}

vec3 StarLayer(vec2 uv, vec2 radial, vec2 repelAt, float pushCells, float spread) {
  vec3 col = vec3(0.0);
  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 si = id + offset;
      float seed = Hash21(si);
      float size = fract(seed * 345.32);
      float glossLocal = tri(uGloss / (PERIOD * seed + 1.0));
      float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

#ifdef PALETTE
      float pick = Hash21(si + 7.0) * float(uColorCount);
      vec3 base = uColors[int(min(floor(pick), float(uColorCount - 1)))];
#else
      float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
      float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
      float grn = min(red, blu) * seed;
      vec3 base = vec3(red, grn, blu);
      float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
      hue = fract(hue + uHueShift / 360.0);
      float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
      float val = max(max(base.r, base.g), base.b);
      base = hsv2rgb(vec3(hue, sat, val));
#endif

      vec2 pad = vec2(tris(seed * 34.0 + uTime * uSpeed / 10.0), tris(seed * 38.0 + uTime * uSpeed / 30.0)) - 0.5;
      vec2 shift = vec2(0.0);
      float invReach = 1.0;
#ifdef REPEL
      vec2 away = si + 0.5 + pad - repelAt;
      float dist = length(away);
      float q = dist * spread;
      float cells = pushCells * exp(-q * q);
      float moved = cells * inversesqrt(1.0 + cells * cells * 2.78);
      shift = away * (moved / max(dist, 0.0001));
      invReach = 1.0 / (1.0 - moved);
#endif
      float star = Star(gv - offset - pad - shift, flareSize, radial, invReach);
      float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
      twinkle = mix(1.0, twinkle, uTwinkleIntensity);
      col += star * twinkle * size * base;
    }
  }
  return col;
}

void main() {
  vec2 focalPx = uFocal * uResolution;
  vec2 uv = (gl_FragCoord.xy - focalPx) / uResolution.y;
  vec2 mouseNorm = uMouse - vec2(0.5);

  vec2 repelAt = vec2(0.0);
  float strength = 0.0;
  float push = 0.0;
  if (uAutoCenterRepulsion > 0.0) {
    strength = uAutoCenterRepulsion;
    push = strength * 0.05;
  } else if (uMouseRepulsion > 0.5) {
    repelAt = (uMouse * uResolution - focalPx) / uResolution.y;
    strength = max(uRepulsionStrength, 0.0);
    push = strength * 0.05 * uMouseActiveFactor;
  } else {
    uv += mouseNorm * 0.1 * uMouseActiveFactor;
  }
  float radius = 0.16 + 0.04 * strength;

  vec2 radial = length(uv) > 0.0001 ? normalize(uv) : vec2(1.0, 0.0);
  float angle = uRotationAngle;
  uv = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * uv;
  uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;
  radial = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * radial;
  radial = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * radial;
  repelAt = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * repelAt;
  repelAt = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * repelAt;

  vec3 col = vec3(0.0);
  float layers = float(uLayers);
  for (int k = 0; k < ${Ee}; k++) {
    if (k >= uLayers) break;
    float i = float(k) / layers;
    float depth = fract(i + uDepth);
    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
    float fade = depth * smoothstep(1.0, 0.9, depth);
    vec2 offset = vec2(i * 453.32);
    col += StarLayer(uv * scale + offset, radial, repelAt * scale + offset, push * scale, 1.0 / (scale * radius)) * fade;
  }
  col *= uReveal;

  if (uMode > 1.5) {
    vec3 lit = col * smoothstep(0.0, 0.3, length(col));
    float energy = max(max(lit.r, lit.g), lit.b);
    vec3 tint = lit / max(energy, 0.0001);
    vec3 ink = tint * (0.16 / max(dot(tint, vec3(0.2126, 0.7152, 0.0722)), 0.16));
    float coverage = pow(min(energy * 1.3, 1.0), 1.3) * 0.92 * uOpacity;
    outColor = uMode > 2.5 ? vec4(ink * coverage, coverage) : vec4(mix(uBackground, ink, coverage), 1.0);
  } else if (uMode > 0.5) {
    float alpha = min(smoothstep(0.0, 0.3, length(col)), 1.0) * uOpacity;
    outColor = vec4(col * alpha, alpha);
  } else {
    outColor = vec4(mix(uBackground, col, uOpacity), 1.0);
  }
}`,$=(t,a,n)=>Math.min(n,Math.max(a,t)),Xe=(t,a,n)=>(t?4:0)+(a?2:0)+(n?1:0),Ye=(t,a,n,r)=>{let m=`${a?`#define PALETTE
`:""}${n?`#define REPEL
`:""}${r?`#define WARP
`:""}`,p=t.createProgram(),v=t.createShader(t.VERTEX_SHADER),y=t.createShader(t.FRAGMENT_SHADER);return!p||!v||!y?null:(t.shaderSource(v,Ve),t.shaderSource(y,$e.replace(`
`,`
${m}`)),t.compileShader(v),t.compileShader(y),t.attachShader(p,v),t.attachShader(p,y),t.bindAttribLocation(p,0,"aPosition"),t.linkProgram(p),t.deleteShader(v),t.deleteShader(y),p)},je=(t,a)=>{if(!t.getProgramParameter(a,t.LINK_STATUS))return null;let n={},r=t.getProgramParameter(a,t.ACTIVE_UNIFORMS);for(let m=0;m<r;m++){let p=t.getActiveUniform(a,m);p&&(n[p.name.replace("[0]","")]=t.getUniformLocation(a,p.name))}return{program:a,uniforms:n}},Ze=({focal:t=[.5,.5],rotation:a=[1,0],starSpeed:n=.5,density:r=1,hueShift:m=140,disableAnimation:p=!1,speed:v=1,mouseInteraction:y=!0,glowIntensity:X=.3,saturation:q=0,mouseRepulsion:H=!0,repulsionStrength:c=2,twinkleIntensity:h=.3,rotationSpeed:S=.1,autoCenterRepulsion:g=0,transparent:M=!0,lightMode:k=!1,starColors:z,starSize:ke=1,flareIntensity:Fe=1,layers:Le=4,direction:Te="forward",clickWarp:Pe=!0,intro:Oe=!0,backgroundColor:_e,opacity:Ie=1,dpr:De,className:ie="",style:Ne,...qe})=>{let se=N(null),ue=N(null),Y=N(null),He=Array.isArray(z)?z.filter(Boolean).slice(0,ae):[],le={focal:Array.isArray(t)?t:[.5,.5],rotation:Array.isArray(a)?a:[1,0],starSpeed:n,density:Math.max(.01,r),hueShift:m,disableAnimation:p,speed:v,mouseInteraction:y,glowIntensity:Math.max(0,X),saturation:Math.max(0,q),mouseRepulsion:H,repulsionStrength:c,twinkleIntensity:$(h,0,1),rotationSpeed:S,autoCenterRepulsion:Math.max(0,g),transparent:M,lightMode:k,palette:He,starSize:Math.max(0,ke),flareIntensity:Math.max(0,Fe),layers:$(Math.round(Le),2,Ee),reverse:Te==="backward",clickWarp:Pe,intro:Oe,backgroundColor:_e,opacity:$(Ie,0,1),dpr:De},x=N(le);return x.current=le,V(()=>{let F=se.current,b=ue.current,o=b?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!F||!b||!o)return;let ce=o.getExtension("KHR_parallel_shader_compile"),G=new Map,K=(e,s,l)=>{let f=Xe(e,s,l),d=G.get(f);return d||(d={program:Ye(o,e,s,l),linked:null,done:!1},G.set(f,d)),d},j=(e,s,l,f)=>{let d=K(e,s,l);if(!d.done&&d.program){if(!f&&ce&&!o.getProgramParameter(d.program,ce.COMPLETION_STATUS_KHR))return null;d.linked=je(o,d.program),d.done=!0}return d.linked},w=x.current;if(!j(w.palette.length>0,!1,!1,!0)){G.forEach(e=>e.program&&o.deleteProgram(e.program));return}let fe=o.createBuffer(),Z=o.createVertexArray();o.bindVertexArray(Z),o.bindBuffer(o.ARRAY_BUFFER,fe),o.bufferData(o.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),o.STATIC_DRAW),o.enableVertexAttribArray(0),o.vertexAttribPointer(0,2,o.FLOAT,!1,0,0);let L=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),T=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,J=new Map,de=(e,s)=>{if(!e)return s;let l=String(e);if(J.has(l))return J.get(l);let f=s;if(L){L.clearRect(0,0,1,1),L.fillStyle="#000000",L.fillStyle=l,L.fillRect(0,0,1,1);let[d,A,E]=L.getImageData(0,0,1,1).data;f=[d/255,A/255,E/255]}return J.set(l,f),f},me=new Float32Array(ae*3),R={x:.5,y:.5,inside:!1},i={time:0,gloss:0,depth:0,angle:0,mx:.5,my:.5,active:0,boost:0,reveal:x.current.intro&&!T?0:1},P=0,O=0,W=!0,Q=()=>{let e=x.current;e.palette.forEach((ze,Ge)=>me.set(de(ze,[1,1,1]),Ge*3));let s=e.lightMode?e.transparent?3:2:e.transparent?1:0,l=de(e.backgroundColor,e.lightMode?[1,1,1]:[0,0,0]),f=i.reveal,d=e.palette.length>0,A=e.autoCenterRepulsion>0||e.mouseRepulsion&&e.repulsionStrength>0&&i.active>0,E=i.boost>0,C=j(d,!1,!1,!0);if(!C)return;let oe=(A||E?j(d,A,E,!1):null)??C,u=oe.uniforms;o.viewport(0,0,b.width,b.height),o.useProgram(oe.program),o.bindVertexArray(Z),o.uniform1f(u.uTime,i.time),o.uniform2f(u.uResolution,b.width,b.height),o.uniform2f(u.uFocal,e.focal[0],e.focal[1]),o.uniform2f(u.uRotation,e.rotation[0],e.rotation[1]),o.uniform1f(u.uGloss,i.gloss),o.uniform1f(u.uDepth,i.depth),o.uniform1f(u.uDensity,e.density),o.uniform1f(u.uHueShift,e.hueShift),o.uniform1f(u.uSpeed,e.speed),o.uniform2f(u.uMouse,i.mx,i.my);let ne=1+i.boost*5;o.uniform1f(u.uStarGlow,.05*e.glowIntensity*e.starSize/Math.pow(ne,.6)),o.uniform1f(u.uFlareGain,e.glowIntensity*e.flareIntensity),o.uniform1f(u.uSquash,1-1/(ne*ne)),o.uniform1f(u.uSaturation,e.saturation),o.uniform1f(u.uMouseRepulsion,e.mouseRepulsion?1:0),o.uniform1f(u.uTwinkleIntensity,e.twinkleIntensity),o.uniform1f(u.uRotationAngle,i.angle),o.uniform1f(u.uRepulsionStrength,e.repulsionStrength),o.uniform1f(u.uMouseActiveFactor,i.active),o.uniform1f(u.uAutoCenterRepulsion,e.autoCenterRepulsion),o.uniform1i(u.uLayers,e.layers),o.uniform3fv(u.uColors,me),o.uniform1i(u.uColorCount,e.palette.length),o.uniform1f(u.uWarp,i.boost);let re=Math.min(1,f/.35);o.uniform1f(u.uReveal,re*re*(3-2*re)),o.uniform1f(u.uMode,s),o.uniform3fv(u.uBackground,l),o.uniform1f(u.uOpacity,e.opacity),o.drawArrays(o.TRIANGLES,0,3)},pe=e=>{if(P=0,!W||document.hidden)return;let s=x.current,l=O?$((e-O)/1e3,5e-4,.05):1/60;O=e;let f=s.disableAnimation||T?0:1;s.intro&&!T&&i.reveal<1?(i.reveal=Math.min(1,i.reveal+l/Be),i.boost=Math.max(i.boost,Math.pow(1-i.reveal,2)*1.4)):(!s.intro||T)&&(i.reveal=1);let d=s.starSpeed/10*(s.reverse?-1:1);i.time+=l*f,i.gloss+=l*d*f,i.depth+=l*d*s.speed*f*(1+i.boost*14),i.angle+=l*s.rotationSpeed*f,i.boost*=Math.exp(-l*1.3),i.boost<.001&&(i.boost=0);let A=1-Math.exp(-l/.325),E=s.mouseInteraction&&R.inside&&!T;E&&(i.mx+=(R.x-i.mx)*A,i.my+=(R.y-i.my)*A);let C=E?1:0;i.active+=(C-i.active)*A,Math.abs(C-i.active)<.001&&(i.active=C),Q(),f>0||i.boost>0||i.active!==C||i.reveal<1?P=requestAnimationFrame(pe):O=0},_=()=>{!P&&W&&!document.hidden&&(P=requestAnimationFrame(pe))},ee=()=>{let e=x.current,s=Math.max(1,F.clientWidth),l=Math.max(1,F.clientHeight),f=Math.min(e.dpr||window.devicePixelRatio||1,2);b.width=Math.max(1,Math.round(s*f)),b.height=Math.max(1,Math.round(l*f)),Q(),_()},he=e=>{let s=F.getBoundingClientRect(),l=e.clientX-s.left,f=e.clientY-s.top;R.inside=l>=0&&f>=0&&l<=s.width&&f<=s.height,R.x=l/Math.max(1,s.width),R.y=1-f/Math.max(1,s.height)},ve=e=>{he(e),_()},ge=e=>{let s=x.current;he(e),!(!R.inside||!s.clickWarp||T)&&(i.boost=Math.min(1.6,i.boost+1),_())},U=e=>{e.pointerType!=="mouse"&&(R.inside=!1)},ye=()=>{R.inside=!1},xe=()=>{O=0,_()},Re=new ResizeObserver(ee);Re.observe(F);let be=new IntersectionObserver(e=>{W=e.some(s=>s.isIntersecting),W&&(O=0,_())});be.observe(F),window.addEventListener("pointermove",ve,{passive:!0}),window.addEventListener("pointerdown",ge,{passive:!0}),window.addEventListener("pointerup",U,{passive:!0}),window.addEventListener("pointercancel",U,{passive:!0}),document.documentElement.addEventListener("pointerleave",ye),document.addEventListener("visibilitychange",xe),ee();let we=w.autoCenterRepulsion>0||w.mouseInteraction&&w.mouseRepulsion,te=w.palette.length>0;(w.clickWarp||w.intro)&&K(te,!1,!0),we&&K(te,!0,!1),we&&w.clickWarp&&K(te,!0,!0);let Ae=x.current.dpr;return Y.current=()=>{let e=x.current;if(e.dpr!==Ae){Ae=e.dpr,ee();return}P||Q(),_()},()=>{cancelAnimationFrame(P),Y.current=null,Re.disconnect(),be.disconnect(),window.removeEventListener("pointermove",ve),window.removeEventListener("pointerdown",ge),window.removeEventListener("pointerup",U),window.removeEventListener("pointercancel",U),document.documentElement.removeEventListener("pointerleave",ye),document.removeEventListener("visibilitychange",xe),G.forEach(e=>e.program&&o.deleteProgram(e.program)),o.deleteBuffer(fe),o.deleteVertexArray(Z),o.getExtension("WEBGL_lose_context")?.loseContext()}},[]),V(()=>{Y.current?.()}),D("div",{ref:se,className:`galaxy-container${ie?` ${ie}`:""}`,style:Ne,...qe},D("canvas",{ref:ue,className:"galaxy-canvas","aria-hidden":"true"}))},Ce=Ze;Me("galaxy",Ce);})();
