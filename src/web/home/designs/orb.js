/*! From React Bits by David Haz, https://reactbits.dev (https://github.com/DavidHDev/react-bits). Run without React for Homebase Hub (1.74.0). This file is NOT under Homebase Hub's GPL; it keeps the React Bits licence (MIT + Commons Clause), written out in full in web/hub/core/assets/glass.js and on the Security and Licence page. */
(()=>{var ie=null,X=Symbol("Fragment");function _e(t,a,n){if(a==="ref"){typeof n=="function"?n(t):n&&(n.current=t);return}if(!(a==="children"||n==null||n===!1)){if(a==="className"){t.setAttribute("class",n);return}if(a==="style"){for(let e in n){let m=n[e];m==null||m===!1||(e.startsWith("--")?t.style.setProperty(e,String(m)):t.style[e]=typeof m=="number"&&!/^(opacity|zIndex|flex|order|zoom|fontWeight|lineHeight)$/.test(e)?m+"px":m)}return}if(/^on[A-Z]/.test(a)&&typeof n=="function"){t.addEventListener(a.slice(2).toLowerCase(),n);return}if(a==="htmlFor"){t.setAttribute("for",n);return}t.setAttribute(a,n===!0?"":String(n))}}function Le(t,a){for(let n of a)n==null||n===!1||n===!0||(Array.isArray(n)?Le(t,n):n instanceof Node?t.appendChild(n):t.appendChild(document.createTextNode(String(n))))}function Y(t,a,...n){if(typeof t=="function")return t({...a,children:n});let e=t===X?document.createDocumentFragment():document.createElement(t);if(t!==X)for(let m in a||{})_e(e,m,a[m]);return Le(e,n),e}var De=(t,a)=>t&&a&&t.length===a.length&&t.every((n,e)=>Object.is(n,a[e]));function q(t){let a=ie,n=a.i++;return a.hooks[n]||(a.hooks[n]={current:t})}function ae(t,a){let n=ie,e=n.i++;n.effects.push([e,t,a])}function Xe(t,a,n){let e={hooks:[],effects:[],i:0,cleanups:[],props:a,dead:!1,queued:!1,tree:null},m=()=>{let l=e.effects;e.effects=[];for(let[x,Z,H]of l){let T=e.cleanups[x];if(T&&H&&De(T.deps,H))continue;if(T&&T.fn)try{T.fn()}catch{}let O;try{O=Z()}catch{O=null}e.cleanups[x]={deps:H,fn:typeof O=="function"?O:null}}},k=l=>{ie=e,e.i=0,e.effects=[];let x;try{x=t(e.props)}finally{ie=null}l&&(e.tree=x,x instanceof Node&&n.appendChild(x)),m()};e.queue=()=>{e.queued||e.dead||(e.queued=!0,Promise.resolve().then(()=>{e.queued=!1,e.dead||k(!1)}))},k(!0);let A=e.tree instanceof Node?e.tree:n,P=["pointermove","pointerdown","pointerup","mousemove","mousedown","mouseup"],$=l=>{if(e.dead||l.__hubFwd||l.target instanceof Element&&l.target.closest("input,textarea,select"))return;let x;try{x=new l.constructor(l.type,l)}catch{return}x.__hubFwd=!0,A.dispatchEvent(x)},j=P.filter(()=>matchMedia("(pointer: fine)").matches);return j.forEach(l=>window.addEventListener(l,$,{passive:!0})),{update(l){e.props={...e.props,...l},k(!1)},destroy(){e.dead=!0,j.forEach(l=>window.removeEventListener(l,$));for(let l of e.cleanups)if(l&&l.fn)try{l.fn()}catch{}e.cleanups=[],e.tree instanceof Node&&e.tree.parentNode&&e.tree.parentNode.removeChild(e.tree)},root:A}}function ke(t,a){(window.HubDesigns=window.HubDesigns||{})[t]={start:(n,e)=>Xe(a,e||{},n)}}var Ye=1.1,U=3.2,qe=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,He=`#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uRotation;
uniform vec2 uReach;
uniform float uNear;
uniform float uAwake;
uniform vec3 uBackground;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uScale;
uniform float uWobble;
uniform float uGlow;
uniform float uBleed;
uniform float uHighlight;
uniform float uSwirl;
uniform float uOrbit;
uniform vec2 uEcho;
uniform float uReveal;
uniform float uOpacity;
uniform float uTrail;
uniform vec2 uTilt;
out vec4 outColor;

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yxz + 19.19);
  return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx);
}

float snoise3(vec3 p) {
  const float K1 = 0.333333333;
  const float K2 = 0.166666667;
  vec3 i = floor(p + (p.x + p.y + p.z) * K1);
  vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
  vec3 e = step(vec3(0.0), d0 - d0.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);
  vec3 d1 = d0 - (i1 - K2);
  vec3 d2 = d0 - (i2 - K1);
  vec3 d3 = d0 - 0.5;
  vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
  vec4 n = h * h * h * h * vec4(dot(d0, hash33(i)), dot(d1, hash33(i + i1)), dot(d2, hash33(i + i2)), dot(d3, hash33(i + 1.0)));
  return dot(vec4(31.316), n);
}

float light1(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * attenuation);
}

float light2(float intensity, float attenuation, float dist) {
  return intensity / (1.0 + dist * dist * attenuation);
}

vec4 draw(vec2 uv) {
  float rawLen = length(uv);
  vec2 dir = rawLen > 0.0001 ? uv / rawLen : vec2(1.0, 0.0);
  float reachAmount = length(uReach);
  vec2 reachDir = reachAmount > 0.00001 ? uReach / reachAmount : vec2(1.0, 0.0);
  float facing = exp((dot(dir, reachDir) - 1.0) * 3.2);
  float len = max(rawLen - reachAmount * facing * smoothstep(0.25, 0.65, rawLen), 0.0);
  uv = dir * len;
  float ang = atan(dir.y, dir.x);
  float invLen = len > 0.0 ? 1.0 / len : 0.0;
  float near = facing * uNear;
  float bgLuminance = dot(uBackground, vec3(0.299, 0.587, 0.114));

  float n0 = snoise3(vec3(uv * 0.65, uTime * 0.5)) * 0.5 + 0.5;
  float r0 = mix(0.8 - 0.04 * uWobble, 0.8 + 0.04 * uWobble, n0);
  float d0 = distance(uv, (r0 * invLen) * uv);
  float v0 = light1(1.0, 10.0 / uGlow, d0);
  v0 *= smoothstep(r0 * 1.05, r0, len);
  float reach = max(uBleed, 0.04);
  float innerFade = smoothstep(r0 * (1.0 - 0.2 * reach), r0 * (1.0 - 0.05 * reach), len);
  v0 *= mix(innerFade, 1.0, bgLuminance * 0.7 * min(uBleed, 1.0));
  float body = smoothstep(0.8 - 0.2 * reach, 0.8, len);
  float cl = cos(ang + uSwirl) * 0.5 + 0.5;

  vec2 pos = vec2(cos(uOrbit), sin(uOrbit)) * r0;
  float d = distance(uv, pos);
  vec2 head = vec2(cos(uOrbit), sin(uOrbit));
  float lag = atan(head.x * dir.y - head.y * dir.x, dot(dir, head));
  float trail = uTrail > 0.0 ? smoothstep(0.0, 0.35, lag) * exp(-max(lag, 0.0) * 2.6 / uTrail) : 0.0;
  float v1 = (light2(1.5, 5.0, d) + trail * 0.6) * uHighlight;
  v1 *= light1(1.0, 50.0, d0);
  float band = v0 * smoothstep(1.0, mix(0.6, 1.0, n0 * 0.5), len) * body;
  float heat = pow(clamp(band / 0.82, 0.0, 1.0), 3.0);
  float bloom = light2(1.0, 160.0 / uGlow, max(len - r0, 0.0)) * smoothstep(0.4, 0.0, len - r0) * step(r0, len);

  float v2 = smoothstep(1.0, mix(0.6, 1.0, n0 * 0.5), len);
  float v3 = body;

  vec3 colBase = mix(uColor1, uColor2, cl);
  float fadeAmount = mix(1.0, 0.1, bgLuminance);

  float echoD = abs(len - r0 - uEcho.x);
  float echo = light1(1.0, 60.0, echoD) * smoothstep(0.12, 0.0, echoD) * uEcho.y;

  vec3 darkCol = mix(uColor3, colBase, v0);
  darkCol = (darkCol + v1) * v2 * v3 * (1.0 + uAwake + near * 0.35) + mix(colBase, vec3(1.0), 0.25) * heat * (0.28 + near * 0.3);
  darkCol = clamp(darkCol + colBase * (bloom * 0.1 + echo), 0.0, 1.0);

  vec3 lightCol = (colBase + v1) * mix(1.0, v2 * v3, fadeAmount);
  lightCol = mix(uBackground, lightCol, clamp(v0 + echo, 0.0, 1.0));
  lightCol = mix(lightCol, colBase, clamp(v0, 0.0, 1.0) * clamp(near * 0.4 + uAwake, 0.0, 0.6));
  lightCol = clamp(mix(lightCol, vec3(1.0), clamp(v1 * 0.35, 0.0, 0.6)), 0.0, 1.0);

  vec3 finalCol = mix(darkCol, lightCol, bgLuminance);
  float alpha = max(max(finalCol.r, finalCol.g), finalCol.b);
  return vec4(finalCol / (alpha + 1e-5), alpha);
}

vec2 toPlane(vec2 p, out float hit) {
  float cx = cos(uTilt.x);
  float sx = sin(uTilt.x);
  float cy = cos(uTilt.y);
  float sy = sin(uTilt.y);
  vec3 ex = vec3(cy, 0.0, -sy);
  vec3 ey = vec3(sy * sx, cx, cy * sx);
  vec3 normal = vec3(sy * cx, -sx, cy * cx);
  vec3 origin = vec3(0.0, 0.0, ${U.toFixed(1)});
  vec3 ray = vec3(p, -${U.toFixed(1)});
  float denom = dot(normal, ray);
  float t = -dot(normal, origin) / (abs(denom) > 0.00001 ? denom : -0.00001);
  hit = t > 0.0 ? 1.0 : 0.0;
  vec3 q = origin + ray * t;
  return vec2(dot(q, ex), dot(q, ey));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - uResolution * 0.5) / min(uResolution.x, uResolution.y) * 2.0;
  uv *= uScale;
  float hit = 1.0;
  if (abs(uTilt.x) + abs(uTilt.y) > 0.0001) uv = toPlane(uv, hit);

  float s = sin(uRotation);
  float c = cos(uRotation);
  uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);

  vec4 col = draw(uv);
  float dither = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  float alpha = clamp(col.a * hit * uReveal * uOpacity + dither, 0.0, 1.0);
  outColor = vec4(col.rgb * alpha * alpha, alpha);
}`,S=(t,a,n)=>Math.min(n,Math.max(a,t)),Pe=(t,a,n)=>{let e=t.createShader(a);return e?(t.shaderSource(e,n),t.compileShader(e),t.getShaderParameter(e,t.COMPILE_STATUS)?e:(t.deleteShader(e),null)):null},Ve=t=>{let a=Pe(t,t.VERTEX_SHADER,qe),n=Pe(t,t.FRAGMENT_SHADER,He),e=t.createProgram();if(!a||!n||!e)return null;if(t.attachShader(e,a),t.attachShader(e,n),t.bindAttribLocation(e,0,"aPosition"),t.linkProgram(e),t.deleteShader(a),t.deleteShader(n),!t.getProgramParameter(e,t.LINK_STATUS))return t.deleteProgram(e),null;let m={},k=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let A=0;A<k;A++){let P=t.getActiveUniform(e,A);P&&(m[P.name]=t.getUniformLocation(e,P.name))}return{program:e,uniforms:m}},We=({colors:t=["#9c43fe","#4cc2e9","#101499"],hue:a=0,backgroundColor:n="#000000",size:e=1,glow:m=1,bleed:k=1,wobble:A=1,highlight:P=1,trail:$=1,tiltX:j=0,tiltY:l=0,speed:x=1,hoverIntensity:Z=1,rotateOnHover:H=!0,forceHoverState:T=!1,followCursor:O=!0,clickPulse:ce=!0,intro:Fe=!0,opacity:Oe=1,paused:Be=!1,dpr:Ie,className:de="",style:ze})=>{let he=q(null),me=q(null),se=q(null),J=Array.isArray(t)?t:[],pe={colors:[J[0]??"#9c43fe",J[1]??J[0]??"#4cc2e9",J[2]??"#101499"].map(String),hue:a,backgroundColor:String(n),size:S(e,.1,3),glow:S(m,.1,5),bleed:S(k,0,4),wobble:Math.max(0,A),highlight:Math.max(0,P),trail:Math.max(0,$),tiltX:S(j,-70,70),tiltY:S(l,-70,70),speed:x,hoverIntensity:Math.max(0,Z),rotateOnHover:H,forceHoverState:T,followCursor:O,clickPulse:ce,intro:Fe,opacity:S(Oe,0,1),paused:Be,dpr:Ie},g=q(pe);return g.current=pe,ae(()=>{let B=he.current,E=me.current,r=E?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!B||!E||!r)return;let Q=Ve(r);if(!Q)return;let u=Q.uniforms,ve=r.createBuffer(),le=r.createVertexArray();r.bindVertexArray(le),r.bindBuffer(r.ARRAY_BUFFER,ve),r.bufferData(r.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),r.STATIC_DRAW),r.enableVertexAttribArray(0),r.vertexAttribPointer(0,2,r.FLOAT,!1,0,0);let I=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),V=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,ue=new Map,xe=i=>{if(ue.has(i))return ue.get(i);let c=[0,0,0];if(I){I.clearRect(0,0,1,1),I.fillStyle="#000000",I.fillStyle=i,I.fillRect(0,0,1,1);let[s,d,p,f]=I.getImageData(0,0,1,1).data;c=f?[s/255,d/255,p/255]:[0,0,0]}return ue.set(i,c),c},Ne=(i,c)=>{if(!c)return i;let s=c*Math.PI/180,d=Math.cos(s),p=Math.sin(s),[f,h,y]=i,b=.299*f+.587*h+.114*y,R=.596*f-.274*h-.322*y,F=.211*f-.523*h+.312*y,M=R*d-F*p,w=R*p+F*d;return[b+.956*M+.621*w,b-.272*M-.647*w,b-1.106*M+1.703*w]},z={width:1,height:1},v={x:0,y:0,inside:!1},o={time:0,swirl:0,orbit:0,echo:1,rotation:0,hover:0,near:0,reachX:0,reachY:0,reachSpeedX:0,reachSpeedY:0,pulse:0,pulseSpeed:0,kick:g.current.intro&&!V?2.5:0,reveal:g.current.intro&&!V?0:1},N=0,_=0,ee=!0,ye=(i,c)=>{let s=g.current,d=Math.min(z.width,z.height),p=1/(s.size*(1+o.pulse)),f=(i-z.width/2)/d*2*p,h=(z.height/2-c)/d*2*p;if(s.tiltX||s.tiltY){let R=-s.tiltX*Math.PI/180,F=s.tiltY*Math.PI/180,[M,w,W,G]=[Math.cos(R),Math.sin(R),Math.cos(F),Math.sin(F)],L=[G*M,-w,W*M],C=[f,h,-U],ne=L[0]*C[0]+L[1]*C[1]+L[2]*C[2],re=-(L[2]*U)/(Math.abs(ne)>1e-5?ne:-1e-5);if(re<=0)return[99,99];let K=[C[0]*re,C[1]*re,U+C[2]*re];f=K[0]*W-K[2]*G,h=K[0]*G*w+K[1]*M+K[2]*W*w}let y=Math.sin(o.rotation),b=Math.cos(o.rotation);return[b*f-y*h,y*f+b*h]},te=()=>{let i=g.current,[c,s,d]=i.colors.map(y=>Ne(xe(y),i.hue)),p=o.reveal,f=p-1,h=1+2.2*f*f*f+1.2*f*f;r.viewport(0,0,E.width,E.height),r.useProgram(Q.program),r.bindVertexArray(le),r.uniform2f(u.uResolution,E.width,E.height),r.uniform1f(u.uTime,o.time),r.uniform2f(u.uReach,o.reachX,o.reachY),r.uniform1f(u.uNear,o.near),r.uniform1f(u.uAwake,o.hover*i.hoverIntensity*.18),r.uniform1f(u.uRotation,o.rotation),r.uniform3fv(u.uBackground,xe(i.backgroundColor)),r.uniform3fv(u.uColor1,c),r.uniform3fv(u.uColor2,s),r.uniform3fv(u.uColor3,d),r.uniform1f(u.uScale,1/(i.size*(1+o.pulse)*(.62+.38*h))),r.uniform1f(u.uWobble,i.wobble),r.uniform1f(u.uGlow,i.glow),r.uniform1f(u.uBleed,i.bleed),r.uniform1f(u.uHighlight,i.highlight),r.uniform2f(u.uEcho,o.echo*.55,o.echo<1?(1-o.echo)*(1-o.echo):0),r.uniform1f(u.uSwirl,o.swirl),r.uniform1f(u.uOrbit,o.orbit),r.uniform1f(u.uReveal,Math.min(1,p/.55)*Math.min(1,p/.55)*(3-2*Math.min(1,p/.55))),r.uniform1f(u.uOpacity,i.opacity),r.uniform1f(u.uTrail,i.trail),r.uniform2f(u.uTilt,-i.tiltX*Math.PI/180,i.tiltY*Math.PI/180),r.drawArrays(r.TRIANGLES,0,3)},ge=i=>{if(N=0,!ee||document.hidden)return;let c=g.current,s=_?S((i-_)/1e3,5e-4,.05):1/60;if(_=i,c.paused){o.reveal=1,te(),_=0;return}let d=V?0:1,[p,f]=ye(v.x,v.y),h=Math.hypot(p,f),y=v.inside&&d?S((1.45-h)/.4,0,1):0,b=y*y*(3-2*y),R=b*S((h-.15)/.45,0,1),F=b>.5,M=c.forceHoverState?1:b;o.hover+=(M-o.hover)*(1-Math.exp(-s/.16));let w=.075*c.hoverIntensity*R,W=h>1e-4?p/h*w:0,G=h>1e-4?f/h*w:0;o.reachSpeedX+=(70*(W-o.reachX)-7*o.reachSpeedX)*s,o.reachSpeedY+=(70*(G-o.reachY)-7*o.reachSpeedY)*s,o.reachX+=o.reachSpeedX*s,o.reachY+=o.reachSpeedY*s,o.near+=(R*c.hoverIntensity-o.near)*(1-Math.exp(-s/.12));let L=s*c.speed*d;o.time+=L,o.swirl+=L*2*(1+o.kick),o.echo=Math.min(1,o.echo+s/1.2),c.rotateOnHover&&(o.rotation+=s*.3*o.hover*d);let C=Math.atan2(f,p);if(c.followCursor&&F&&d){let ne=Math.atan2(Math.sin(C-o.orbit),Math.cos(C-o.orbit));o.orbit+=ne*(1-Math.exp(-s*6))}else o.orbit-=L;o.orbit=Math.atan2(Math.sin(o.orbit),Math.cos(o.orbit)),o.pulseSpeed+=(-170*o.pulse-11*o.pulseSpeed)*s,o.pulse+=o.pulseSpeed*s,o.kick*=Math.exp(-s*2.5),!c.intro||V?o.reveal=1:o.reveal<1&&(o.reveal=Math.min(1,o.reveal+s/Ye)),te(),N=requestAnimationFrame(ge)},D=()=>{!N&&ee&&!document.hidden&&(N=requestAnimationFrame(ge))},fe=()=>{let i=g.current,c=Math.max(1,B.clientWidth),s=Math.max(1,B.clientHeight),d=Math.min(i.dpr||window.devicePixelRatio||1,2);z.width=c,z.height=s,E.width=Math.max(1,Math.round(c*d)),E.height=Math.max(1,Math.round(s*d)),te(),D()},be=i=>{let c=B.getBoundingClientRect();v.x=i.clientX-c.left,v.y=i.clientY-c.top,v.inside=v.x>=0&&v.y>=0&&v.x<=c.width&&v.y<=c.height},we=i=>{be(i),g.current.paused||D()},Me=i=>{let c=g.current;if(be(i),!v.inside||!c.clickPulse||c.paused||V)return;let[s,d]=ye(v.x,v.y);Math.hypot(s,d)>1||(o.pulseSpeed+=.9,o.kick=2.2,o.echo=0,D())},oe=i=>{i.pointerType!=="mouse"&&(v.inside=!1)},Ce=()=>{v.inside=!1},Se=()=>{_=0,D()},Ae=new ResizeObserver(fe);Ae.observe(B);let Ee=new IntersectionObserver(i=>{ee=i.some(c=>c.isIntersecting),ee&&(_=0,D())});Ee.observe(B),window.addEventListener("pointermove",we,{passive:!0}),window.addEventListener("pointerdown",Me,{passive:!0}),window.addEventListener("pointerup",oe,{passive:!0}),window.addEventListener("pointercancel",oe,{passive:!0}),document.documentElement.addEventListener("pointerleave",Ce),document.addEventListener("visibilitychange",Se),fe();let Re=g.current.dpr;return se.current=()=>{let i=g.current;if(i.dpr!==Re){Re=i.dpr,fe();return}N||te(),D()},()=>{cancelAnimationFrame(N),se.current=null,Ae.disconnect(),Ee.disconnect(),window.removeEventListener("pointermove",we),window.removeEventListener("pointerdown",Me),window.removeEventListener("pointerup",oe),window.removeEventListener("pointercancel",oe),document.documentElement.removeEventListener("pointerleave",Ce),document.removeEventListener("visibilitychange",Se),r.deleteProgram(Q.program),r.deleteBuffer(ve),r.deleteVertexArray(le),r.getExtension("WEBGL_lose_context")?.loseContext()}},[]),ae(()=>{se.current?.()}),Y("div",{ref:he,className:`orb-container${de?` ${de}`:""}`,style:ze},Y("canvas",{ref:me,className:"orb-canvas","aria-hidden":"true"}))},Te=We;ke("orb",Te);})();
