/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */
(()=>{var B=null,O=Symbol("Fragment");function We(t,a,n){if(a==="ref"){typeof n=="function"?n(t):n&&(n.current=t);return}if(!(a==="children"||n==null||n===!1)){if(a==="className"){t.setAttribute("class",n);return}if(a==="style"){for(let r in n){let m=n[r];m==null||m===!1||(r.startsWith("--")?t.style.setProperty(r,String(m)):t.style[r]=typeof m=="number"&&!/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(r)?m+"px":m)}return}if(/^on[A-Z]/.test(a)&&typeof n=="function"){t.addEventListener(a.slice(2).toLowerCase(),n);return}if(a==="htmlFor"){t.setAttribute("for",n);return}t.setAttribute(a,n===!0?"":String(n))}}function Se(t,a){for(let n of a)n==null||n===!1||n===!0||(Array.isArray(n)?Se(t,n):n instanceof Node?t.appendChild(n):t.appendChild(document.createTextNode(String(n))))}function _(t,a,...n){if(typeof t=="function")return t({...a,children:n});let r=t===O?document.createDocumentFragment():document.createElement(t);if(t!==O)for(let m in a||{})We(r,m,a[m]);return Se(r,n),r}var Ue=(t,a)=>t&&a&&t.length===a.length&&t.every((n,r)=>Object.is(n,a[r]));function I(t){let a=B,n=a.i++;return a.hooks[n]||(a.hooks[n]={current:t})}function K(t,a){let n=B,r=n.i++;n.effects.push([r,t,a])}function Be(t,a,n){let r={hooks:[],effects:[],i:0,cleanups:[],props:a,dead:!1,queued:!1,tree:null},m=()=>{let f=r.effects;r.effects=[];for(let[h,H,D]of f){let A=r.cleanups[h];if(A&&D&&Ue(A.deps,D))continue;if(A&&A.fn)try{A.fn()}catch{}let E;try{E=H()}catch{E=null}r.cleanups[h]={deps:D,fn:typeof E=="function"?E:null}}},p=f=>{B=r,r.i=0,r.effects=[];let h;try{h=t(r.props)}finally{B=null}f&&(r.tree=h,h instanceof Node&&n.appendChild(h)),m()};r.queue=()=>{r.queued||r.dead||(r.queued=!0,Promise.resolve().then(()=>{r.queued=!1,r.dead||p(!1)}))},p(!0);let v=r.tree instanceof Node?r.tree:n,g=["pointermove","pointerdown","pointerup","mousemove","mousedown","mouseup"],N=f=>{if(r.dead||f.__hubFwd||f.target instanceof Element&&f.target.closest("input,textarea,select"))return;let h;try{h=new f.constructor(f.type,f)}catch{return}h.__hubFwd=!0,v.dispatchEvent(h)},q=g.filter(()=>matchMedia("(pointer: fine)").matches);return q.forEach(f=>window.addEventListener(f,N,{passive:!0})),{update(f){r.props={...r.props,...f},p(!1)},destroy(){r.dead=!0,q.forEach(f=>window.removeEventListener(f,N));for(let f of r.cleanups)if(f&&f.fn)try{f.fn()}catch{}r.cleanups=[],r.tree instanceof Node&&r.tree.parentNode&&r.tree.parentNode.removeChild(r.tree)},root:v}}function Me(t,a){(window.HubDesigns=window.HubDesigns||{})[t]={start:(n,r)=>Be(a,r||{},n)}}var Ee=8,re=4,Ke=2.2,Ve=`#version 300 es
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
uniform vec3 uColors[${re}];
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
}`,V=(t,a,n)=>Math.min(n,Math.max(a,t)),Xe=(t,a,n)=>(t?4:0)+(a?2:0)+(n?1:0),Ye=(t,a,n,r)=>{let m=`${a?`#define PALETTE
`:""}${n?`#define REPEL
`:""}${r?`#define WARP
`:""}`,p=t.createProgram(),v=t.createShader(t.VERTEX_SHADER),g=t.createShader(t.FRAGMENT_SHADER);return!p||!v||!g?null:(t.shaderSource(v,Ve),t.shaderSource(g,$e.replace(`
`,`
${m}`)),t.compileShader(v),t.compileShader(g),t.attachShader(p,v),t.attachShader(p,g),t.bindAttribLocation(p,0,"aPosition"),t.linkProgram(p),t.deleteShader(v),t.deleteShader(g),p)},je=(t,a)=>{if(!t.getProgramParameter(a,t.LINK_STATUS))return null;let n={},r=t.getProgramParameter(a,t.ACTIVE_UNIFORMS);for(let m=0;m<r;m++){let p=t.getActiveUniform(a,m);p&&(n[p.name.replace("[0]","")]=t.getUniformLocation(a,p.name))}return{program:a,uniforms:n}},Ze=({focal:t=[.5,.5],rotation:a=[1,0],starSpeed:n=.5,density:r=1,hueShift:m=140,disableAnimation:p=!1,speed:v=1,mouseInteraction:g=!0,glowIntensity:N=.3,saturation:q=0,mouseRepulsion:f=!0,repulsionStrength:h=2,twinkleIntensity:H=.3,rotationSpeed:D=.1,autoCenterRepulsion:A=0,transparent:E=!0,lightMode:$=!1,starColors:ae,starSize:Fe=1,flareIntensity:Le=1,layers:ke=4,direction:Te="forward",clickWarp:Pe=!0,intro:Oe=!0,backgroundColor:_e,opacity:Ie=1,dpr:De,className:ie="",style:Ne,...qe})=>{let se=I(null),ue=I(null),X=I(null),He=Array.isArray(ae)?ae.filter(Boolean).slice(0,re):[],le={focal:Array.isArray(t)?t:[.5,.5],rotation:Array.isArray(a)?a:[1,0],starSpeed:n,density:Math.max(.01,r),hueShift:m,disableAnimation:p,speed:v,mouseInteraction:g,glowIntensity:Math.max(0,N),saturation:Math.max(0,q),mouseRepulsion:f,repulsionStrength:h,twinkleIntensity:V(H,0,1),rotationSpeed:D,autoCenterRepulsion:Math.max(0,A),transparent:E,lightMode:$,palette:He,starSize:Math.max(0,Fe),flareIntensity:Math.max(0,Le),layers:V(Math.round(ke),2,Ee),reverse:Te==="backward",clickWarp:Pe,intro:Oe,backgroundColor:_e,opacity:V(Ie,0,1),dpr:De},y=I(le);return y.current=le,K(()=>{let C=se.current,R=ue.current,o=R?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!C||!R||!o)return;let ce=o.getExtension("KHR_parallel_shader_compile"),z=new Map,G=(e,s,l)=>{let c=Xe(e,s,l),d=z.get(c);return d||(d={program:Ye(o,e,s,l),linked:null,done:!1},z.set(c,d)),d},Y=(e,s,l,c)=>{let d=G(e,s,l);if(!d.done&&d.program){if(!c&&ce&&!o.getProgramParameter(d.program,ce.COMPLETION_STATUS_KHR))return null;d.linked=je(o,d.program),d.done=!0}return d.linked},w=y.current;if(!Y(w.palette.length>0,!1,!1,!0)){z.forEach(e=>e.program&&o.deleteProgram(e.program));return}let fe=o.createBuffer(),j=o.createVertexArray();o.bindVertexArray(j),o.bindBuffer(o.ARRAY_BUFFER,fe),o.bufferData(o.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),o.STATIC_DRAW),o.enableVertexAttribArray(0),o.vertexAttribPointer(0,2,o.FLOAT,!1,0,0);let F=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),L=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,Z=new Map,de=(e,s)=>{if(!e)return s;let l=String(e);if(Z.has(l))return Z.get(l);let c=s;if(F){F.clearRect(0,0,1,1),F.fillStyle="#000000",F.fillStyle=l,F.fillRect(0,0,1,1);let[d,b,S]=F.getImageData(0,0,1,1).data;c=[d/255,b/255,S/255]}return Z.set(l,c),c},me=new Float32Array(re*3),x={x:.5,y:.5,inside:!1},i={time:0,gloss:0,depth:0,angle:0,mx:.5,my:.5,active:0,boost:0,reveal:y.current.intro&&!L?0:1},k=0,T=0,W=!0,J=()=>{let e=y.current;e.palette.forEach((ze,Ge)=>me.set(de(ze,[1,1,1]),Ge*3));let s=e.lightMode?e.transparent?3:2:e.transparent?1:0,l=de(e.backgroundColor,e.lightMode?[1,1,1]:[0,0,0]),c=i.reveal,d=e.palette.length>0,b=e.autoCenterRepulsion>0||e.mouseRepulsion&&e.repulsionStrength>0&&i.active>0,S=i.boost>0,M=Y(d,!1,!1,!0);if(!M)return;let te=(b||S?Y(d,b,S,!1):null)??M,u=te.uniforms;o.viewport(0,0,R.width,R.height),o.useProgram(te.program),o.bindVertexArray(j),o.uniform1f(u.uTime,i.time),o.uniform2f(u.uResolution,R.width,R.height),o.uniform2f(u.uFocal,e.focal[0],e.focal[1]),o.uniform2f(u.uRotation,e.rotation[0],e.rotation[1]),o.uniform1f(u.uGloss,i.gloss),o.uniform1f(u.uDepth,i.depth),o.uniform1f(u.uDensity,e.density),o.uniform1f(u.uHueShift,e.hueShift),o.uniform1f(u.uSpeed,e.speed),o.uniform2f(u.uMouse,i.mx,i.my);let oe=1+i.boost*5;o.uniform1f(u.uStarGlow,.05*e.glowIntensity*e.starSize/Math.pow(oe,.6)),o.uniform1f(u.uFlareGain,e.glowIntensity*e.flareIntensity),o.uniform1f(u.uSquash,1-1/(oe*oe)),o.uniform1f(u.uSaturation,e.saturation),o.uniform1f(u.uMouseRepulsion,e.mouseRepulsion?1:0),o.uniform1f(u.uTwinkleIntensity,e.twinkleIntensity),o.uniform1f(u.uRotationAngle,i.angle),o.uniform1f(u.uRepulsionStrength,e.repulsionStrength),o.uniform1f(u.uMouseActiveFactor,i.active),o.uniform1f(u.uAutoCenterRepulsion,e.autoCenterRepulsion),o.uniform1i(u.uLayers,e.layers),o.uniform3fv(u.uColors,me),o.uniform1i(u.uColorCount,e.palette.length),o.uniform1f(u.uWarp,i.boost);let ne=Math.min(1,c/.35);o.uniform1f(u.uReveal,ne*ne*(3-2*ne)),o.uniform1f(u.uMode,s),o.uniform3fv(u.uBackground,l),o.uniform1f(u.uOpacity,e.opacity),o.drawArrays(o.TRIANGLES,0,3)},pe=e=>{if(k=0,!W||document.hidden)return;let s=y.current,l=T?V((e-T)/1e3,5e-4,.05):1/60;T=e;let c=s.disableAnimation||L?0:1;s.intro&&!L&&i.reveal<1?(i.reveal=Math.min(1,i.reveal+l/Ke),i.boost=Math.max(i.boost,Math.pow(1-i.reveal,2)*1.4)):(!s.intro||L)&&(i.reveal=1);let d=s.starSpeed/10*(s.reverse?-1:1);i.time+=l*c,i.gloss+=l*d*c,i.depth+=l*d*s.speed*c*(1+i.boost*14),i.angle+=l*s.rotationSpeed*c,i.boost*=Math.exp(-l*1.3),i.boost<.001&&(i.boost=0);let b=1-Math.exp(-l/.325),S=s.mouseInteraction&&x.inside&&!L;S&&(i.mx+=(x.x-i.mx)*b,i.my+=(x.y-i.my)*b);let M=S?1:0;i.active+=(M-i.active)*b,Math.abs(M-i.active)<.001&&(i.active=M),J(),c>0||i.boost>0||i.active!==M||i.reveal<1?k=requestAnimationFrame(pe):T=0},P=()=>{!k&&W&&!document.hidden&&(k=requestAnimationFrame(pe))},Q=()=>{let e=y.current,s=Math.max(1,C.clientWidth),l=Math.max(1,C.clientHeight),c=Math.min(e.dpr||window.devicePixelRatio||1,2);R.width=Math.max(1,Math.round(s*c)),R.height=Math.max(1,Math.round(l*c)),J(),P()},he=e=>{let s=C.getBoundingClientRect(),l=e.clientX-s.left,c=e.clientY-s.top;x.inside=l>=0&&c>=0&&l<=s.width&&c<=s.height,x.x=l/Math.max(1,s.width),x.y=1-c/Math.max(1,s.height)},ve=e=>{he(e),P()},ge=e=>{let s=y.current;he(e),!(!x.inside||!s.clickWarp||L)&&(i.boost=Math.min(1.6,i.boost+1),P())},U=e=>{e.pointerType!=="mouse"&&(x.inside=!1)},ye=()=>{x.inside=!1},xe=()=>{T=0,P()},Re=new ResizeObserver(Q);Re.observe(C);let we=new IntersectionObserver(e=>{W=e.some(s=>s.isIntersecting),W&&(T=0,P())});we.observe(C),window.addEventListener("pointermove",ve,{passive:!0}),window.addEventListener("pointerdown",ge,{passive:!0}),window.addEventListener("pointerup",U,{passive:!0}),window.addEventListener("pointercancel",U,{passive:!0}),document.documentElement.addEventListener("pointerleave",ye),document.addEventListener("visibilitychange",xe),Q();let be=w.autoCenterRepulsion>0||w.mouseInteraction&&w.mouseRepulsion,ee=w.palette.length>0;(w.clickWarp||w.intro)&&G(ee,!1,!0),be&&G(ee,!0,!1),be&&w.clickWarp&&G(ee,!0,!0);let Ae=y.current.dpr;return X.current=()=>{let e=y.current;if(e.dpr!==Ae){Ae=e.dpr,Q();return}k||J(),P()},()=>{cancelAnimationFrame(k),X.current=null,Re.disconnect(),we.disconnect(),window.removeEventListener("pointermove",ve),window.removeEventListener("pointerdown",ge),window.removeEventListener("pointerup",U),window.removeEventListener("pointercancel",U),document.documentElement.removeEventListener("pointerleave",ye),document.removeEventListener("visibilitychange",xe),z.forEach(e=>e.program&&o.deleteProgram(e.program)),o.deleteBuffer(fe),o.deleteVertexArray(j),o.getExtension("WEBGL_lose_context")?.loseContext()}},[]),K(()=>{X.current?.()}),_("div",{ref:se,className:`galaxy-container${ie?` ${ie}`:""}`,style:Ne,...qe},_("canvas",{ref:ue,className:"galaxy-canvas","aria-hidden":"true"}))},Ce=Ze;Me("galaxy",Ce);})();
