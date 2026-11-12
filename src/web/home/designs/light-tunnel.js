/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */
(()=>{var G=null,N=Symbol("Fragment");function ze(t,i,r){if(i==="ref"){typeof r=="function"?r(t):r&&(r.current=t);return}if(!(i==="children"||r==null||r===!1)){if(i==="className"){t.setAttribute("class",r);return}if(i==="style"){for(let e in r){let c=r[e];c==null||c===!1||(e.startsWith("--")?t.style.setProperty(e,String(c)):t.style[e]=typeof c=="number"&&!/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(e)?c+"px":c)}return}if(/^on[A-Z]/.test(i)&&typeof r=="function"){t.addEventListener(i.slice(2).toLowerCase(),r);return}if(i==="htmlFor"){t.setAttribute("for",r);return}t.setAttribute(i,r===!0?"":String(r))}}function we(t,i){for(let r of i)r==null||r===!1||r===!0||(Array.isArray(r)?we(t,r):r instanceof Node?t.appendChild(r):t.appendChild(document.createTextNode(String(r))))}function B(t,i,...r){if(typeof t=="function")return t({...i,children:r});let e=t===N?document.createDocumentFragment():document.createElement(t);if(t!==N)for(let c in i||{})ze(e,c,i[c]);return we(e,r),e}var Ge=(t,i)=>t&&i&&t.length===i.length&&t.every((r,e)=>Object.is(r,i[e]));function D(t){let i=G,r=i.i++;return i.hooks[r]||(i.hooks[r]={current:t})}function X(t,i){let r=G,e=r.i++;r.effects.push([e,t,i])}function Xe(t,i,r){let e={hooks:[],effects:[],i:0,cleanups:[],props:i,dead:!1,queued:!1,tree:null},c=()=>{let s=e.effects;e.effects=[];for(let[d,U,W]of s){let M=e.cleanups[d];if(M&&W&&Ge(M.deps,W))continue;if(M&&M.fn)try{M.fn()}catch{}let R;try{R=U()}catch{R=null}e.cleanups[d]={deps:W,fn:typeof R=="function"?R:null}}},b=s=>{G=e,e.i=0,e.effects=[];let d;try{d=t(e.props)}finally{G=null}s&&(e.tree=d,d instanceof Node&&r.appendChild(d)),c()};e.queue=()=>{e.queued||e.dead||(e.queued=!0,Promise.resolve().then(()=>{e.queued=!1,e.dead||b(!1)}))},b(!0);let g=e.tree instanceof Node?e.tree:r,S=["pointermove","pointerdown","pointerup","mousemove","mousedown","mouseup"],_=s=>{if(e.dead||s.__hubFwd||s.target instanceof Element&&s.target.closest("input,textarea,select"))return;let d;try{d=new s.constructor(s.type,s)}catch{return}d.__hubFwd=!0,g.dispatchEvent(d)},q=S.filter(()=>matchMedia("(pointer: fine)").matches);return q.forEach(s=>window.addEventListener(s,_,{passive:!0})),{update(s){e.props={...e.props,...s},b(!1)},destroy(){e.dead=!0,q.forEach(s=>window.removeEventListener(s,_));for(let s of e.cleanups)if(s&&s.fn)try{s.fn()}catch{}e.cleanups=[],e.tree instanceof Node&&e.tree.parentNode&&e.tree.parentNode.removeChild(e.tree)},root:g}}function ye(t,i){(window.HubDesigns=window.HubDesigns||{})[t]={start:(r,e)=>Xe(i,e||{},r)}}var Ye=1.8,$e=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,je=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uScale;
uniform float uRatio;
uniform float uTime;
uniform float uDrift;
uniform vec2 uSteer;
uniform float uBend;
uniform float uCount;
uniform float uSwing;
uniform float uWave;
uniform float uWidth;
uniform float uPulseWidth;
uniform float uHead;
uniform float uTail;
uniform float uChance;
uniform float uSpacing;
uniform float uPulseSpeed;
uniform float uFlow;
uniform float uHalo;
uniform float uGlow;
uniform float uBrightness;
uniform float uVariance;
uniform float uBody;
uniform float uFadeNear;
uniform float uFadeFar;
uniform vec3 uCable;
uniform vec3 uPulse;
uniform vec3 uTunnel;
uniform vec3 uSurge;
uniform float uReveal;
uniform float uGrain;
uniform float uSeed;
uniform float uLight;
uniform float uOpacity;
out vec4 outColor;

const float TAU = 6.2831853;

vec3 inkOf(vec3 color, float depthOfInk) {
  float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float peak = max(color.r, max(color.g, color.b));
  float chroma = (peak - min(color.r, min(color.g, color.b))) / max(peak, 0.001);
  return color * min(1.0, mix(depthOfInk, depthOfInk * 1.7, chroma) / max(luma, 0.001));
}

float hash(float n) {
  return fract(sin(n * 127.1 + uSeed * 311.7) * 43758.5453);
}

vec2 bendAt(float depth) {
  float reach = 1.0 - exp(-max(depth, 0.0) * 0.55);
  vec2 wobble = vec2(sin(uDrift * 0.37 + depth * 0.31), cos(uDrift * 0.29 + depth * 0.23)) * uBend;
  return (wobble + uSteer) * reach;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution - uCenter) / uScale;
  float depth = -log(max(length(p), 1e-5));
  vec2 q = p;
  for (int i = 0; i < 4; i++) {
    q = p - bendAt(depth);
    depth = -log(max(length(q), 1e-5));
  }
  float r = length(q);
  float px = r * uScale;
  float turn = atan(q.y, q.x) / TAU;
  float s = turn - uSwing - uWave * sin(depth * 1.2 + uDrift * 0.5);
  float cell = floor(s * uCount);
  float spacing = TAU * px / uCount;
  float near = smoothstep(0.55, 1.25, r);
  float width = uWidth * (1.0 + near * 1.2);
  float soft = uRatio * (0.55 + near * 0.9);
  float tight = uRatio * uHalo * (1.0 + near);
  float wide = tight * 4.5;

  float lines = 0.0;
  float body = 0.0;
  vec3 glow = vec3(0.0);
  float strokes = 0.0;
  for (int k = -3; k <= 3; k++) {
    float i = cell + float(k);
    float id = mod(i, uCount);
    float h1 = hash(id);
    float h2 = hash(id + 17.0);
    float h3 = hash(id + 41.0);
    float h4 = hash(id + 73.0);
    float center = (i + 0.5 + (h1 - 0.5) * 0.55) / uCount;
    center += 0.12 * sin(depth * (0.8 + h2 * 0.9) + uDrift * (0.4 + h3 * 0.5) + h4 * TAU) / uCount;
    float d = abs(s - center) * TAU * px;
    float shade = 1.0 + uVariance * (h3 - 0.5) * 0.9;
    float reach = smoothstep(spacing * 2.4, spacing * 1.4, d);

    lines += smoothstep(width + soft, width - soft, d) * shade;
    body += exp(-d / max(spacing * 0.22, 0.001)) * shade * reach;

    float x = depth * uSpacing + uTime * uPulseSpeed * (0.55 + h2 * 0.6) * uFlow + h4 * 7.0;
    float lead = (fract(x) - 0.5) / uSpacing * uFlow;
    float lit = step(hash(id * 3.7 + floor(x) * 13.1), uChance);
    float limit = 0.5 / uSpacing;
    float head = exp(-pow(max(-lead, 0.0) / uHead, 2.0)) * smoothstep(-limit, -limit * 0.8, lead);
    float tail = exp(-max(lead, 0.0) / uTail) * smoothstep(limit, limit * 0.55, lead);
    float pulse = (lead < 0.0 ? head : tail) * lit;
    float ring = uSurge.y * exp(-pow((depth - uSurge.x) / uSurge.z, 2.0));
    pulse = max(pulse, ring);
    float hot = pulse * (lead < 0.0 ? 1.0 : exp(-max(lead, 0.0) / (uTail * 0.35)));

    float core = uPulseWidth * width + 0.35 * uRatio;
    float stroke = smoothstep(core + soft, core - soft, d);
    float bloom = (exp(-d / tight) * 0.7 + exp(-d / wide) * 0.18) * uGlow * reach;
    vec3 tint = mix(uPulse, vec3(1.0), hot * 0.55 * (1.0 - uLight));
    glow += tint * pulse * (stroke * 1.5 + bloom) * shade;
    strokes += pulse * stroke * shade;
  }

  float lod = smoothstep(4.0, 1.2, spacing);
  float average = min(2.0 * uWidth / max(spacing, 0.001), 1.0);
  lines = mix(lines, average, lod);
  glow = mix(glow, uPulse * average * 0.6 * uChance, lod);
  strokes = mix(strokes, average * 0.6 * uChance, lod);
  body = mix(body, 1.0, lod) * uBody;

  float rr = r * 0.25;
  float fade = smoothstep(0.0, uFadeNear, rr) * smoothstep(uFadeFar, uFadeFar * 0.55, rr);
  fade *= smoothstep(uReveal - 0.6, uReveal, depth);

  float grain = 1.0;
  if (uGrain > 0.0) {
    grain += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + uTime * 7.0) * 43758.5453) - 0.5) * uGrain * 4.0;
  }

  if (uLight > 0.5) {
    float hairline = clamp(lines * 0.26 + body * 0.2, 0.0, 1.0);
    float stroke = clamp(strokes * 1.6, 0.0, 1.0);
    float haze = clamp(length(glow) * 0.12, 0.0, 0.25);
    float ink = clamp(hairline + stroke + haze, 0.0, 1.0) * fade * uOpacity * grain;
    vec3 tone = mix(inkOf(uCable, 0.3), inkOf(uPulse, 0.16), clamp(stroke + haze * 2.0, 0.0, 1.0));
    tone = mix(tone, inkOf(uTunnel, 0.3), clamp(body * uBody, 0.0, 1.0) * 0.5);
    outColor = vec4(tone * ink, ink);
    return;
  }

  vec3 light = (uCable * lines * 0.12 + uTunnel * body * 0.35 + glow) * uBrightness * fade * grain;
  vec3 mapped = (1.0 - exp(-light * 1.4)) * uOpacity;
  outColor = vec4(mapped, max(mapped.r, max(mapped.g, mapped.b)));
}`,h=(t,i,r)=>Math.min(r,Math.max(i,t)),be=(t,i,r)=>{let e=t.createShader(i);return e?(t.shaderSource(e,r),t.compileShader(e),t.getShaderParameter(e,t.COMPILE_STATUS)?e:(t.deleteShader(e),null)):null},Ke=t=>{let i=be(t,t.VERTEX_SHADER,$e),r=be(t,t.FRAGMENT_SHADER,je),e=t.createProgram();if(!i||!r||!e)return null;if(t.attachShader(e,i),t.attachShader(e,r),t.bindAttribLocation(e,0,"aPosition"),t.linkProgram(e),t.deleteShader(i),t.deleteShader(r),!t.getProgramParameter(e,t.LINK_STATUS))return t.deleteProgram(e),null;let c={},b=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let g=0;g<b;g++){let S=t.getActiveUniform(e,g);S&&(c[S.name]=t.getUniformLocation(e,S.name))}return{program:e,uniforms:c}},Ze=({cableColor:t="#ffffff",pulseColor:i="#ffffff",tunnelColor:r="#ffffff",tunnelOpacity:e=0,speed:c=.1,flowDirection:b="inward",pulseSpeed:g=2,pulseLength:S=.28,pulseBlend:_=.6,pulseWidth:q=1,pulseDensity:s=.5,cableCount:d=56,thickness:U=.35,rimWidth:W=.15,waviness:M=.3,sway:R=.5,bend:Y=.4,size:Me=1,centerX:Ae=0,centerY:Ce=0,glow:Ee=1,fadeNear:Re=.5,fadeFar:ke=2,brightness:Fe=1,colorVariance:Pe=!0,grain:Te=!1,grainIntensity:Le=.05,opacity:Oe=1,mouseInteraction:Ne=!0,mouseStrength:Be=.1,clickSurge:De=!0,intro:We=!0,variation:Ie=0,lightMode:_e=!1,dpr:qe,className:ne="",style:Ue,...Ve})=>{let oe=D(null),re=D(null),$=D(null),ie={cableColor:t,pulseColor:i,tunnelColor:r,tunnelOpacity:h(e,0,1),speed:Math.max(0,c),flow:b==="outward"?1:-1,pulseSpeed:Math.max(0,g),pulseLength:h(S,.02,1),pulseBlend:h(_,0,1),pulseWidth:h(q,.1,3),pulseDensity:h(s,0,1),cableCount:h(Math.round(d),4,200),thickness:h(U,.05,2),rimWidth:h(W,0,1),waviness:Math.max(0,M),sway:Math.max(0,R),bend:Math.max(0,Y),size:Math.max(.05,Me),centerX:Ae,centerY:Ce,glow:Math.max(0,Ee),fadeNear:Math.max(.001,Re),fadeFar:Math.max(.01,ke),brightness:Math.max(0,Fe),colorVariance:Pe,grain:Te,grainIntensity:Math.max(0,Le),opacity:h(Oe,0,1),mouseInteraction:Ne,mouseStrength:Math.max(0,Be),clickSurge:De,intro:We,variation:Ie,lightMode:_e,dpr:qe},v=D(ie);return v.current=ie,X(()=>{let A=oe.current,k=re.current,n=k?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!A||!k||!n)return;let V=Ke(n);if(!V)return;let a=V.uniforms,ae=n.createBuffer(),j=n.createVertexArray();n.bindVertexArray(j),n.bindBuffer(n.ARRAY_BUFFER,ae),n.bufferData(n.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),n.STATIC_DRAW),n.enableVertexAttribArray(0),n.vertexAttribPointer(0,2,n.FLOAT,!1,0,0);let F=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),K=new Map,Z=(o,u)=>{if(!o)return u;let f=String(o);if(K.has(f))return K.get(f);let l=u;if(F){F.clearRect(0,0,1,1),F.fillStyle="#000000",F.fillStyle=f,F.fillRect(0,0,1,1);let[m,E,y]=F.getImageData(0,0,1,1).data;l=[m/255,E/255,y/255]}return K.set(f,l),l},P=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,p={x:0,y:0,inside:!1},x={x:0,y:0},C={age:10},ue=0,J=0,w=v.current.intro&&!P?0:1,T=0,L=0,H=!0,Q=()=>{let o=v.current,u=k.width,f=k.height,l=u/Math.max(1,A.clientWidth),m=Math.min(u,f),E=o.flow,y=3.4,I=C.age*2.6,te=E>0?y-I:-.6+I,ve=C.age<2.4?Math.min(1,C.age/.12)*Math.exp(-C.age*1.1):0,He=w*w*(3-2*w);n.viewport(0,0,u,f),n.useProgram(V.program),n.bindVertexArray(j),n.uniform2f(a.uResolution,u,f),n.uniform2f(a.uCenter,o.centerX*m,o.centerY*m),n.uniform1f(a.uScale,m*.5*o.size),n.uniform1f(a.uRatio,l),n.uniform1f(a.uTime,ue),n.uniform1f(a.uDrift,J),n.uniform2f(a.uSteer,x.x,x.y),n.uniform1f(a.uBend,o.bend*.45),n.uniform1f(a.uCount,o.cableCount),n.uniform1f(a.uSwing,Math.sin(J*.9)*o.sway*.5/(Math.PI*2)),n.uniform1f(a.uWave,o.waviness*.15),n.uniform1f(a.uWidth,(.25+o.thickness*1.5)*l),n.uniform1f(a.uPulseWidth,.6+o.pulseWidth*.9);let xe=o.pulseLength*1.2;n.uniform1f(a.uHead,xe*(.08+o.pulseBlend*.22)),n.uniform1f(a.uTail,xe*(.5+o.pulseBlend*.7)),n.uniform1f(a.uChance,o.pulseDensity),n.uniform1f(a.uSpacing,.4),n.uniform1f(a.uPulseSpeed,o.pulseSpeed*4),n.uniform1f(a.uFlow,E),n.uniform1f(a.uHalo,1.2+o.rimWidth*8),n.uniform1f(a.uGlow,o.glow),n.uniform1f(a.uBrightness,o.brightness),n.uniform1f(a.uVariance,o.colorVariance?1:0),n.uniform1f(a.uBody,o.tunnelOpacity),n.uniform1f(a.uFadeNear,o.fadeNear),n.uniform1f(a.uFadeFar,o.fadeFar),n.uniform3fv(a.uCable,Z(o.cableColor,[1,1,1])),n.uniform3fv(a.uPulse,Z(o.pulseColor,[1,1,1])),n.uniform3fv(a.uTunnel,Z(o.tunnelColor,[1,1,1])),n.uniform3f(a.uSurge,te,ve,.22),n.uniform1f(a.uReveal,1.7-He*3.6),n.uniform1f(a.uGrain,o.grain?o.grainIntensity:0),n.uniform1f(a.uSeed,o.variation),n.uniform1f(a.uLight,o.lightMode?1:0),n.uniform1f(a.uOpacity,o.opacity),n.drawArrays(n.TRIANGLES,0,3)},se=o=>{if(T=0,!H||document.hidden)return;let u=v.current,f=L?h((o-L)/1e3,5e-4,.05):1/60;L=o;let l=P?0:1;ue+=f*u.speed*l,J+=f*(u.speed+.2)*l,C.age+=f,u.intro&&!P&&w<1?w=Math.min(1,w+f/Ye):(!u.intro||P)&&(w=1);let m=u.mouseInteraction&&p.inside&&!P,E=u.mouseStrength*2.5,y=m?[p.x*E,p.y*E]:[0,0],I=1-Math.exp(-f/.6);x.x+=(y[0]-x.x)*I,x.y+=(y[1]-x.y)*I,Q();let te=Math.abs(y[0]-x.x)<5e-4&&Math.abs(y[1]-x.y)<5e-4;l>0||!te||w<1||C.age<2.4?T=requestAnimationFrame(se):L=0},O=()=>{!T&&H&&!document.hidden&&(T=requestAnimationFrame(se))},ee=()=>{let o=v.current,u=Math.max(1,A.clientWidth),f=Math.max(1,A.clientHeight),l=Math.min(o.dpr||window.devicePixelRatio||1,2);k.width=Math.max(1,Math.round(u*l)),k.height=Math.max(1,Math.round(f*l)),Q(),O()},fe=o=>{let u=A.getBoundingClientRect(),f=o.clientX-u.left,l=o.clientY-u.top;p.inside=f>=0&&l>=0&&f<=u.width&&l<=u.height;let m=Math.min(u.width,u.height)*.5;p.x=(f-u.width/2)/Math.max(1,m),p.y=(u.height/2-l)/Math.max(1,m)},le=o=>{fe(o),O()},ce=o=>{fe(o),!(!p.inside||!v.current.clickSurge||P)&&(C.age=0,O())},z=o=>{o.pointerType!=="mouse"&&(p.inside=!1)},de=()=>{p.inside=!1},me=()=>{L=0,O()},he=new ResizeObserver(ee);he.observe(A);let pe=new IntersectionObserver(o=>{H=o.some(u=>u.isIntersecting),H&&(L=0,O())});pe.observe(A),window.addEventListener("pointermove",le,{passive:!0}),window.addEventListener("pointerdown",ce,{passive:!0}),window.addEventListener("pointerup",z,{passive:!0}),window.addEventListener("pointercancel",z,{passive:!0}),document.documentElement.addEventListener("pointerleave",de),document.addEventListener("visibilitychange",me),ee();let ge=v.current.dpr;return $.current=()=>{let o=v.current;if(o.dpr!==ge){ge=o.dpr,ee();return}T||Q(),O()},()=>{cancelAnimationFrame(T),$.current=null,he.disconnect(),pe.disconnect(),window.removeEventListener("pointermove",le),window.removeEventListener("pointerdown",ce),window.removeEventListener("pointerup",z),window.removeEventListener("pointercancel",z),document.documentElement.removeEventListener("pointerleave",de),document.removeEventListener("visibilitychange",me),n.deleteProgram(V.program),n.deleteBuffer(ae),n.deleteVertexArray(j),n.getExtension("WEBGL_lose_context")?.loseContext()}},[]),X(()=>{$.current?.()}),B("div",{ref:oe,className:`light-tunnel-container${ne?` ${ne}`:""}`,style:Ue,...Ve},B("canvas",{ref:re,className:"light-tunnel-canvas","aria-hidden":"true"}))},Se=Ze;ye("light-tunnel",Se);})();
